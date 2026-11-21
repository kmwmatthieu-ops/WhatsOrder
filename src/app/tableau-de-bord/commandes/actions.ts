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

  // 1. Récupérer le montant total et le mode de règlement de la commande
  const { data: orderData } = await supabase
    .from("orders")
    .select("id, total, amount_paid, payment_method")
    .eq("id", orderId)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (!orderData) {
    return { error: "Commande introuvable." };
  }

  // 2. Mettre à jour le statut de la commande
  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus as OrderStatus })
    .eq("id", orderId)
    .eq("shop_id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error, "Impossible de modifier le statut.") };
  }

  // 3. Synchronisation automatique du règlement selon le statut choisi :
  // - Si la commande est Confirmée ou Livrée, on valide automatiquement le solde restant comme payé.
  // - Si la commande est Annulée, on purge les règlements enregistrés sur cette commande.
  if (newStatus === "confirmed" || newStatus === "delivered") {
    const { data: existingPayments } = await supabase
      .from("order_payments")
      .select("amount")
      .eq("order_id", orderId)
      .eq("shop_id", shop.id);

    const paidSum = (existingPayments ?? []).reduce((acc, p) => acc + p.amount, 0);
    const remaining = Math.max(0, orderData.total - paidSum);

    if (remaining > 0) {
      await supabase.from("order_payments").insert({
        order_id: orderId,
        shop_id: shop.id,
        amount: remaining,
        method: (orderData.payment_method as PaymentMethod) || "cash",
        note: "Règlement validé à la confirmation de la commande",
        idempotency_key: `auto-confirm-${orderId}-${Date.now()}`,
      });
    }
  } else if (newStatus === "cancelled") {
    await supabase
      .from("order_payments")
      .delete()
      .eq("order_id", orderId)
      .eq("shop_id", shop.id);
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
