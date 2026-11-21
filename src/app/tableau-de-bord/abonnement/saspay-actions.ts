"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { requireShop, getUser } from "@/lib/supabase/server";
import { getActiveSubscriptionPlans } from "@/lib/subscription";
import {
  createSaspayCheckoutSession,
  getSaspayCheckoutSessionStatus,
  SaspayApiError,
} from "@/lib/saspay/client";
import { fulfillSaspaySubscription } from "@/lib/saspay/fulfillment";
import { siteUrl, PRODUCTION_SITE_URL } from "@/lib/constants";

async function resolvePublicOrigin(): Promise<string> {
  try {
    const h = await headers();
    const origin = h.get("origin");
    if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return origin.replace(/\/$/, "");
    }
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || "https";
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  } catch {
    /* ignore */
  }
  const fallback = siteUrl();
  return fallback.includes("localhost") && process.env.NODE_ENV === "production"
    ? PRODUCTION_SITE_URL
    : fallback;
}

export type InitiateCheckoutResult = {
  ok: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
};

/**
 * Initialise une session de paiement hébergée SasPay pour changer de forfait ou renouveler son abonnement.
 */
export async function initiateSaspaySubscriptionCheckout(
  planId: "business" | "premium",
  durationMonths: number
): Promise<InitiateCheckoutResult> {
  try {
    const { shop, supabase } = await requireShop();
    const user = await getUser();

    if (!user || !user.email) {
      return { ok: false, error: "Utilisateur non authentifié." };
    }

    // 1. Validation du plan
    const plans = await getActiveSubscriptionPlans();
    const targetPlan = plans.find((p) => p.id === planId);
    if (!targetPlan) {
      return { ok: false, error: "Formule d'abonnement introuvable." };
    }

    if (![1, 3, 6, 12].includes(durationMonths)) {
      return { ok: false, error: "La durée doit être de 1, 3, 6 ou 12 mois." };
    }

    // 2. Calcul du montant en chaîne décimale stricte (ex: "5000.00")
    const totalAmount = (targetPlan.price_monthly * durationMonths).toFixed(2);
    const publicOrigin = await resolvePublicOrigin();
    const idempotencyKey = crypto.randomUUID();

    // 3. Appel de l'API SasPay pour créer la session de checkout
    let session;
    try {
      session = await createSaspayCheckoutSession({
        amount: totalAmount,
        currency: "XOF",
        customer_email: user.email,
        customer_name: shop.name || user.email.split("@")[0],
        description: `Abonnement ${targetPlan.name} (${durationMonths} mois) - ${shop.name}`,
        return_url: `${publicOrigin}/tableau-de-bord/abonnement/retour?session_id={id}`,
        metadata: {
          shop_id: shop.id,
          user_id: user.id,
          plan_id: planId,
          duration_months: durationMonths,
        },
      });
    } catch (err: unknown) {
      console.error("Erreur createSaspayCheckoutSession:", err);
      if (err instanceof SaspayApiError) {
        return { ok: false, error: `Erreur SasPay (${err.statusCode}): ${err.message}` };
      }
      return { ok: false, error: "Impossible d'initialiser le paiement sécurisé avec SasPay. Réessayez." };
    }

    // 4. Enregistrement de la session dans la base locale (saspay_payments)
    const { error: insertErr } = await supabase.from("saspay_payments").insert({
      shop_id: shop.id,
      user_id: user.id,
      plan_id: planId,
      duration_months: durationMonths,
      amount: totalAmount,
      currency: "XOF",
      saspay_session_id: session.id,
      checkout_url: session.checkout_url,
      status: "PENDING",
      idempotency_key: idempotencyKey,
      metadata: {
        shop_name: shop.name,
        plan_name: targetPlan.name,
        session_slug: session.slug,
      },
    });

    if (insertErr) {
      console.error("Erreur enregistrement saspay_payments:", insertErr);
      // Même en cas d'erreur locale d'insertion, si on a checkout_url, l'utilisateur peut continuer
    }

    return {
      ok: true,
      checkoutUrl: session.checkout_url,
      sessionId: session.id,
    };
  } catch (err: unknown) {
    console.error("Erreur initiateSaspaySubscriptionCheckout:", err);
    return { ok: false, error: "Une erreur inattendue est survenue." };
  }
}

/**
 * Vérifie le statut de la session de paiement lorsque le commerçant revient sur la plateforme.
 */
export async function verifySaspayReturnSession(sessionId: string): Promise<{
  ok: boolean;
  status: "SUCCESS" | "PENDING" | "FAILED";
  message?: string;
  planName?: string;
}> {
  try {
    const { shop, supabase } = await requireShop();

    if (!sessionId) {
      return { ok: false, status: "FAILED", message: "Identifiant de session manquant." };
    }

    // 1. Récupère l'enregistrement local
    const { data: record } = await supabase
      .from("saspay_payments")
      .select("*")
      .eq("saspay_session_id", sessionId)
      .eq("shop_id", shop.id)
      .maybeSingle();

    if (!record) {
      return { ok: false, status: "FAILED", message: "Transaction introuvable pour votre boutique." };
    }

    // Si déjà validé
    if (record.status === "SUCCESS" && record.delivered_at) {
      return {
        ok: true,
        status: "SUCCESS",
        message: "Votre abonnement est déjà actif !",
      };
    }

    // 2. Interroge SasPay pour le statut de la session
    const sessionStatus = await getSaspayCheckoutSessionStatus(sessionId);

    // Si la session a une transaction associée
    const paymentId = sessionStatus.transaction?.id;
    if (paymentId) {
      await supabase
        .from("saspay_payments")
        .update({
          saspay_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);
    }

    // 3. Déclenche la livraison si possible
    const fulfillResult = await fulfillSaspaySubscription({
      sessionId,
      paymentId,
    });

    return {
      ok: fulfillResult.ok,
      status: fulfillResult.status,
      message: fulfillResult.message,
    };
  } catch (err: unknown) {
    console.error("Erreur verifySaspayReturnSession:", err);
    return {
      ok: false,
      status: "PENDING",
      message: "Vérification en cours de traitement par l'opérateur.",
    };
  }
}
