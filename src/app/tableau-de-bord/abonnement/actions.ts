"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireShop } from "@/lib/supabase/server";
import { getActiveSubscriptionPlans } from "@/lib/subscription";

const upgradeSchema = z.object({
  requested_plan_id: z.enum(["business", "premium"]),
  duration_months: z.coerce.number().int().refine((val) => [1, 3, 6, 12].includes(val), {
    message: "La durée doit être de 1, 3, 6 ou 12 mois.",
  }),
  payment_method: z.enum(["wave", "orange_money", "mtn_momo", "moov_money"]),
  sender_phone: z.string().trim().min(8, "Numéro de téléphone émetteur requis (au moins 8 chiffres)."),
  transaction_reference: z.string().trim().max(100).optional(),
});

export type UpgradeActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  requestId?: string;
};

/**
 * Enregistre une demande de mise à niveau / renouvellement d'abonnement manuel Mobile Money.
 */
export async function requestSubscriptionUpgrade(
  _prev: UpgradeActionState,
  formData: FormData
): Promise<UpgradeActionState> {
  try {
    const { shop, supabase } = await requireShop();

    const parsed = upgradeSchema.safeParse({
      requested_plan_id: formData.get("requested_plan_id"),
      duration_months: formData.get("duration_months"),
      payment_method: formData.get("payment_method"),
      sender_phone: formData.get("sender_phone"),
      transaction_reference: formData.get("transaction_reference") || undefined,
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Données invalides." };
    }

    const { requested_plan_id, duration_months, payment_method, sender_phone, transaction_reference } =
      parsed.data;

    // 1. Vérification du plan
    const plans = await getActiveSubscriptionPlans();
    const targetPlan = plans.find((p) => p.id === requested_plan_id);
    if (!targetPlan) {
      return { ok: false, error: "Plan d'abonnement introuvable." };
    }

    // 2. Calcul du montant dû
    const amountDue = targetPlan.price_monthly * duration_months;

    // 3. Vérification qu'aucune demande 'pending' n'est déjà en cours
    const { data: existingPending } = await supabase
      .from("subscription_requests")
      .select("id")
      .eq("shop_id", shop.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      return {
        ok: false,
        error: "Une demande de paiement est déjà en cours de vérification pour votre boutique.",
      };
    }

    // 4. Insertion de la demande
    const { data: inserted, error: insertError } = await supabase
      .from("subscription_requests")
      .insert({
        shop_id: shop.id,
        requested_plan_id,
        duration_months,
        amount_due: amountDue,
        payment_method,
        sender_phone,
        transaction_reference: transaction_reference || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return { ok: false, error: "Impossible d'enregistrer la demande. Réessayez." };
    }

    revalidatePath("/tableau-de-bord/abonnement");
    return {
      ok: true,
      message: "Votre demande a été enregistrée avec succès. Notre équipe va la valider dès réception.",
      requestId: inserted.id,
    };
  } catch (err) {
    console.error("Erreur requestSubscriptionUpgrade:", err);
    return { ok: false, error: "Une erreur est survenue lors de l'enregistrement de votre demande." };
  }
}

/**
 * Permet au commerçant d'annuler une demande de changement de plan restée en attente.
 */
export async function cancelSubscriptionRequest(requestId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { shop, supabase } = await requireShop();

    const { error } = await supabase
      .from("subscription_requests")
      .delete()
      .eq("id", requestId)
      .eq("shop_id", shop.id)
      .eq("status", "pending");

    if (error) {
      return { ok: false, error: "Impossible d'annuler cette demande." };
    }

    revalidatePath("/tableau-de-bord/abonnement");
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur lors de l'annulation." };
  }
}
