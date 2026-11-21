import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { verifySaspayPayment } from "./client";
import type { SaspayPayment } from "@/types/database";

export interface FulfillSubscriptionResult {
  ok: boolean;
  status: "SUCCESS" | "PENDING" | "FAILED";
  message?: string;
  alreadyDelivered?: boolean;
  payment?: SaspayPayment | null;
}

/**
 * Active l'abonnement d'une boutique après vérification stricte du paiement SasPay.
 * Règle d'or : Seul SUCCESS autorise la livraison, et la livraison est strictement idempotente.
 */
export async function fulfillSaspaySubscription(params: {
  paymentId?: string;
  sessionId?: string;
}): Promise<FulfillSubscriptionResult> {
  const supabase = await createClient();

  // 1. Trouver l'enregistrement saspay_payments correspondant
  let query = supabase.from("saspay_payments").select("*");
  if (params.paymentId) {
    query = query.eq("saspay_payment_id", params.paymentId);
  } else if (params.sessionId) {
    query = query.eq("saspay_session_id", params.sessionId);
  } else {
    return { ok: false, status: "FAILED", message: "Identifiant de paiement ou de session manquant." };
  }

  const { data: record, error: findError } = await query.maybeSingle();
  if (findError || !record) {
    return { ok: false, status: "FAILED", message: "Transaction SasPay introuvable dans la base locale." };
  }

  // 2. Contrôle d'idempotence : déjà livré ?
  if (record.delivered_at && record.status === "SUCCESS") {
    return {
      ok: true,
      status: "SUCCESS",
      alreadyDelivered: true,
      message: "Cet abonnement a déjà été activé.",
      payment: record as SaspayPayment,
    };
  }

  // 3. Vérification de l'état réel auprès de l'API SasPay
  let finalStatus: "SUCCESS" | "PENDING" | "FAILED" = "PENDING";
  let netAmount = record.net_amount;
  let debitedAmount = record.debited_amount;
  let confirmedPaymentId = record.saspay_payment_id || params.paymentId;

  if (confirmedPaymentId) {
    try {
      const verified = await verifySaspayPayment(confirmedPaymentId);
      finalStatus = verified.status === "SUCCESS" ? "SUCCESS" : verified.status === "FAILED" ? "FAILED" : "PENDING";
      netAmount = verified.net_amount || netAmount;
      debitedAmount = verified.debited_amount || debitedAmount;
    } catch (err) {
      console.error("Erreur lors de la vérification SasPay:", err);
      // Ne pas échouer définitivement si erreur réseau temporaire : laisser en PENDING
      return { ok: false, status: "PENDING", message: "Vérification en cours auprès de l'opérateur." };
    }
  } else {
    // Si pas de paymentId direct, la vérification peut venir du webhook transaction.success
    return { ok: false, status: "PENDING", message: "En attente de confirmation du paiement." };
  }

  // 4. Si non réussi, mettre à jour le statut et sortir SANS livrer
  if (finalStatus !== "SUCCESS") {
    await supabase
      .from("saspay_payments")
      .update({
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    return {
      ok: false,
      status: finalStatus,
      message: finalStatus === "PENDING" ? "Paiement en attente de validation." : "Le paiement a échoué.",
      payment: record as SaspayPayment,
    };
  }

  // 5. SUCCESS confirmé : activer l'abonnement
  const now = new Date();
  
  // Calcul de la nouvelle date d'expiration (prolonge si déjà actif)
  const { data: existingSub } = await supabase
    .from("shop_subscriptions")
    .select("*")
    .eq("shop_id", record.shop_id)
    .maybeSingle();

  let baseDate = now;
  if (existingSub?.expires_at && existingSub.plan_id === record.plan_id) {
    const existingExp = new Date(existingSub.expires_at);
    if (existingExp.getTime() > now.getTime()) {
      baseDate = existingExp;
    }
  }

  const newExpiresAt = new Date(baseDate);
  newExpiresAt.setMonth(newExpiresAt.getMonth() + record.duration_months);

  // A. Mise à jour ou insertion de shop_subscriptions
  const { error: subErr } = await supabase
    .from("shop_subscriptions")
    .upsert(
      {
        shop_id: record.shop_id,
        plan_id: record.plan_id,
        status: "active",
        starts_at: now.toISOString(),
        expires_at: newExpiresAt.toISOString(),
        notes: `Payé en ligne via SasPay (Réf: ${confirmedPaymentId})`,
        updated_at: now.toISOString(),
      },
      { onConflict: "shop_id" }
    );

  if (subErr) {
    console.error("Erreur mise à jour shop_subscriptions:", subErr);
    return { ok: false, status: "FAILED", message: "Erreur lors de l'activation de l'abonnement." };
  }

  // B. Marquer saspay_payments comme livré (delivered_at)
  const { data: updatedPayment } = await supabase
    .from("saspay_payments")
    .update({
      status: "SUCCESS",
      delivered_at: now.toISOString(),
      net_amount: netAmount,
      debited_amount: debitedAmount,
      updated_at: now.toISOString(),
    })
    .eq("id", record.id)
    .select("*")
    .single();

  // C. Enregistrer dans subscription_requests pour aligner le tableau de bord Admin et le MRR
  const numericAmount = Math.round(parseFloat(record.amount) || 0);
  await supabase.from("subscription_requests").insert({
    shop_id: record.shop_id,
    requested_plan_id: record.plan_id,
    duration_months: record.duration_months,
    amount_due: numericAmount,
    payment_method: "saspay",
    sender_phone: (record.metadata as Record<string, string>)?.customer_phone || "Paiement en ligne",
    transaction_reference: confirmedPaymentId,
    status: "approved",
    admin_notes: `Validé automatiquement par SasPay (${confirmedPaymentId})`,
    reviewed_at: now.toISOString(),
  });

  revalidatePath("/tableau-de-bord/abonnement");
  revalidatePath("/admin");

  return {
    ok: true,
    status: "SUCCESS",
    message: "Abonnement activé avec succès !",
    payment: updatedPayment as SaspayPayment,
  };
}
