"use server";

import { headers } from "next/headers";
import { createClient, getUser } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export interface ReportState {
  ok?: boolean;
  message?: string;
  error?: string;
}

const VALID_REASONS = [
  "produit_interdit",
  "contrefacon",
  "arnaque",
  "inapproprie",
  "autre",
] as const;

export async function submitReportAction(
  _prev: ReportState,
  formData: FormData
): Promise<ReportState> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    // Limitation anti-abus : max 5 signalements par IP par 10 minutes
    const rateCheck = checkRateLimit(`report:${ip}`, 5, 10 * 60 * 1000);
    if (!rateCheck.success) {
      return {
        error: "Trop de signalements envoyés récemment. Veuillez patienter quelques minutes.",
      };
    }

    const targetType = formData.get("target_type") as "product" | "shop";
    const productId = formData.get("product_id") as string | null;
    const shopId = formData.get("shop_id") as string | null;
    const reason = formData.get("reason") as string | null;
    const details = formData.get("details") as string | null;

    if (!targetType || !["product", "shop"].includes(targetType)) {
      return { error: "Cible de signalement invalide." };
    }

    if (!shopId) {
      return { error: "Boutique manquante pour le signalement." };
    }

    if (!reason || !VALID_REASONS.includes(reason as (typeof VALID_REASONS)[number])) {
      return { error: "Veuillez sélectionner un motif valide pour ce signalement." };
    }

    const supabase = await createClient();
    const user = await getUser();

    const { error: insertError } = await supabase.from("reports").insert({
      reporter_id: user?.id ?? null,
      target_type: targetType,
      product_id: targetType === "product" ? productId : null,
      shop_id: shopId,
      reason,
      details: details ? details.trim().slice(0, 1000) : null,
      status: "pending",
    });

    if (insertError) {
      return { error: "Impossible d'enregistrer le signalement. Réessayez plus tard." };
    }

    return {
      ok: true,
      message: "Merci. Votre signalement a été transmis à notre équipe de modération.",
    };
  } catch {
    return { error: "Une erreur inattendue est survenue." };
  }
}
