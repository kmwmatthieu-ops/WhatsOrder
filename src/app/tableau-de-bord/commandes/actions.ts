"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import type { OrderPayment } from "@/types/database";

const VALID_STATUSES = [
  "new",
  "confirmed",
  "preparing",
  "ready",
  "delivering",
  "delivered",
  "cancelled",
] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

const VALID_PAYMENT_METHODS = ["cash", "cash_on_delivery", "mobile_money"] as const;
type PaymentMethod = (typeof VALID_PAYMENT_METHODS)[number];

export async function updateOrderStatus(
  orderId: string,
  newStatus: string
): Promise<{ error?: string }> {
  const { shop, supabase } = await requireShop();

  if (!VALID_STATUSES.includes(newStatus as OrderStatus)) {
    return { error: "Statut invalide." };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus as OrderStatus })
    .eq("id", orderId)
    .eq("shop_id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error, "Impossible de modifier le statut.") };
  }

  revalidatePath("/tableau-de-bord");
  revalidatePath("/tableau-de-bord/commandes");
  revalidatePath(`/tableau-de-bord/commandes/${orderId}`);
  return {};
}

/**
 * V2-D : Ajoute une transaction de paiement (partielle ou intégrale) dans le journal order_payments.
 * Le trigger PostgreSQL sync_order_payment_summary() recalcule automatiquement
 * orders.amount_paid, orders.payment_status et orders.payment_method.
 */
export async function addOrderPayment(input: {
  orderId: string;
  amount: number;
  method: string;
  note?: string | null;
  paidAt?: string | null;
  idempotencyKey: string;
}): Promise<{ error?: string; payment?: OrderPayment }> {
  const { shop, supabase } = await requireShop();

  const cleanAmount = Math.round(Number(input.amount));
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
    return { error: "Veuillez saisir un montant supérieur à 0 FCFA." };
  }

  if (!VALID_PAYMENT_METHODS.includes(input.method as PaymentMethod)) {
    return { error: "Mode de paiement invalide." };
  }

  const cleanNote = input.note?.trim() ? input.note.trim().slice(0, 200) : null;
  let paidAtIso = new Date().toISOString();
  if (input.paidAt) {
    const parsedDate = new Date(input.paidAt);
    if (!Number.isNaN(parsedDate.getTime())) {
      paidAtIso = parsedDate.toISOString();
    }
  }

  const { data, error } = await supabase
    .from("order_payments")
    .insert({
      order_id: input.orderId,
      shop_id: shop.id,
      amount: cleanAmount,
      method: input.method as PaymentMethod,
      note: cleanNote,
      paid_at: paidAtIso,
      idempotency_key: input.idempotencyKey || crypto.randomUUID(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Ce versement vient déjà d'être enregistré." };
    }
    return { error: dbErrorMessage(error, "Impossible d'enregistrer ce versement.") };
  }

  revalidatePath("/tableau-de-bord");
  revalidatePath("/tableau-de-bord/commandes");
  revalidatePath(`/tableau-de-bord/commandes/${input.orderId}`);
  return { payment: data as OrderPayment };
}

/**
 * Supprime une écriture de paiement saisie par erreur.
 * Le trigger PostgreSQL recalcule immédiatement le solde restant et le statut de paiement.
 */
export async function deleteOrderPayment(
  orderId: string,
  paymentId: string
): Promise<{ error?: string }> {
  const { shop, supabase } = await requireShop();

  const { error } = await supabase
    .from("order_payments")
    .delete()
    .eq("id", paymentId)
    .eq("order_id", orderId)
    .eq("shop_id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error, "Impossible de supprimer ce versement.") };
  }

  revalidatePath("/tableau-de-bord");
  revalidatePath("/tableau-de-bord/commandes");
  revalidatePath(`/tableau-de-bord/commandes/${orderId}`);
  return {};
}
