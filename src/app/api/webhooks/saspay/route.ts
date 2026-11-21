import { NextRequest, NextResponse } from "next/server";
import { verifySaspayWebhookSignature } from "@/lib/saspay/client";
import { fulfillSaspaySubscription } from "@/lib/saspay/fulfillment";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Route Webhook officielle pour SasPay : POST /api/webhooks/saspay
 * 
 * Sécurité :
 * 1. Vérification de la signature HMAC SHA-256 sur le corps brut (raw body).
 * 2. Vérification de l'anti-rejeu : horodatage rejeté si écart > 300 secondes.
 * 3. Traitement strictement idempotent des événements de paiement.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");
    const event = req.headers.get("x-webhook-event");

    // 1. Contrôle des headers obligatoires
    if (!signature || !timestamp) {
      return NextResponse.json(
        { error: "En-têtes de signature SasPay manquants (X-Webhook-Signature, X-Webhook-Timestamp)." },
        { status: 401 }
      );
    }

    // 2. Vérification de la signature cryptographique et de l'âge
    const isValid = verifySaspayWebhookSignature(rawBody, signature, timestamp);
    if (!isValid) {
      return NextResponse.json(
        { error: "Signature de webhook invalide ou horodatage expiré (> 300s)." },
        { status: 401 }
      );
    }

    // 3. Décodage du corps JSON
    let payload: { event: string; data: Record<string, unknown> };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
    }

    const eventName = event || payload.event;

    // 4. Événement de test SasPay
    if (eventName === "webhook.test") {
      return NextResponse.json({
        success: true,
        message: "Test webhook reçu et validé avec succès.",
      });
    }

    // 5. Traitement de transaction.success
    if (eventName === "transaction.success") {
      const data = payload.data || {};
      const paymentId = (data.id as string) || (data.transaction_id as string);

      if (!paymentId) {
        return NextResponse.json({ error: "Identifiant de paiement absent." }, { status: 400 });
      }

      // Si le paiement est associé à une checkout_session dans les métadonnées
      const metadata = (data.metadata || {}) as Record<string, unknown>;
      const sessionId = metadata.checkout_session_id as string | undefined;

      // Rattacher le paymentId dans la table si nécessaire
      const supabase = await createClient();
      if (sessionId) {
        await supabase
          .from("saspay_payments")
          .update({
            saspay_payment_id: paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq("saspay_session_id", sessionId);
      }

      // Déclencher la livraison / activation d'abonnement (idempotente)
      await fulfillSaspaySubscription({ paymentId, sessionId });

      return NextResponse.json({ success: true, processed: true });
    }

    // 6. Traitement de transaction.failed
    if (eventName === "transaction.failed") {
      const data = payload.data || {};
      const paymentId = (data.id as string) || (data.transaction_id as string);
      if (paymentId) {
        const supabase = await createClient();
        await supabase
          .from("saspay_payments")
          .update({
            status: "FAILED",
            updated_at: new Date().toISOString(),
          })
          .eq("saspay_payment_id", paymentId);
      }

      return NextResponse.json({ success: true, recorded: true });
    }

    // Autres événements (ex: settlement, wallet_transfer) : acquitter rapidement en 200
    return NextResponse.json({ success: true, unhandled: true });
  } catch (error: unknown) {
    console.error("Erreur inattendue dans le webhook SasPay:", error);
    return NextResponse.json(
      { error: "Erreur interne lors du traitement du webhook." },
      { status: 500 }
    );
  }
}
