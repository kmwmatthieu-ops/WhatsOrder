"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";

const VALID_STATUSES = ["new", "confirmed", "ready", "delivered", "cancelled"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

const VALID_PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;
type PaymentStatus = (typeof VALID_PAYMENT_STATUSES)[number];

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

export async function updateOrderPayment(
  orderId: string,
  paymentStatus: string,
  paymentMethod: string | null,
  amountPaid: number
): Promise<{ error?: string }> {
  const { shop, supabase } = await requireShop();

  if (!VALID_PAYMENT_STATUSES.includes(paymentStatus as PaymentStatus)) {
    return { error: "Statut de paiement invalide." };
  }

  if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
    return { error: "Mode de paiement invalide." };
  }

  if (amountPaid < 0) {
    return { error: "Le montant ne peut pas être négatif." };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: paymentStatus as PaymentStatus,
      payment_method: (paymentMethod as PaymentMethod) || null,
      amount_paid: Math.round(amountPaid),
    })
    .eq("id", orderId)
    .eq("shop_id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error, "Impossible d'enregistrer le paiement.") };
  }

  revalidatePath("/tableau-de-bord");
  revalidatePath("/tableau-de-bord/commandes");
  revalidatePath(`/tableau-de-bord/commandes/${orderId}`);
  return {};
}
