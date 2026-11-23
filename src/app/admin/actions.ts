"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { MEDIA_BUCKET } from "@/lib/constants";

export async function toggleShopStatus(
  shopId: string,
  newStatus: "active" | "suspended"
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Vérifier les droits d'administration
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { error: "Accès refusé : rôle administrateur requis." };
  }

  const { error } = await supabase
    .from("shops")
    .update({ status: newStatus })
    .eq("id", shopId);

  if (error) {
    return { error: dbErrorMessage(error, "Impossible de modifier le statut de la boutique.") };
  }

  revalidatePath("/admin");
  return {};
}

/**
 * Supprime définitivement une boutique par un administrateur.
 * Nettoie les fichiers multimédias de stockage et supprime la boutique en base (cascade PostgreSQL).
 */
export async function adminDeleteShopAction(
  shopId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Vérifier les droits d'administration
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : rôle administrateur requis." };
  }

  // 2. Récupérer la boutique pour connaître son slug et nettoyer le stockage
  const { data: shop, error: fetchErr } = await supabase
    .from("shops")
    .select("id, name, slug")
    .eq("id", shopId)
    .single();

  if (fetchErr || !shop) {
    return { ok: false, error: "Boutique introuvable." };
  }

  // 3. Nettoyage préventif des médias hébergés dans Storage
  try {
    const folders = ["logo", "banner", "products"];
    for (const folder of folders) {
      const { data: files } = await supabase.storage
        .from(MEDIA_BUCKET)
        .list(`${shop.id}/${folder}`);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${shop.id}/${folder}/${f.name}`);
        await supabase.storage.from(MEDIA_BUCKET).remove(paths);
      }
    }
  } catch {
    // Non bloquant
  }

  // 4. Suppression en base de données (déclenche ON DELETE CASCADE pour toutes les tables dépendantes)
  const { error: deleteErr } = await supabase
    .from("shops")
    .delete()
    .eq("id", shopId);

  if (deleteErr) {
    return { ok: false, error: dbErrorMessage(deleteErr, "Impossible de supprimer la boutique.") };
  }

  // 5. Invalidation des chemins et caches Next.js
  revalidatePath("/admin");
  revalidatePath("/explorer");
  revalidatePath("/boutiques");
  revalidatePath(`/${shop.slug}`);

  return { ok: true };
}

/**
 * Valide une demande de paiement Mobile Money et active l'abonnement de la boutique.
 */
export async function approveSubscriptionRequest(
  requestId: string,
  customDurationMonths?: number,
  adminNotes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getUser();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : rôle administrateur requis." };
  }

  // 1. Récupère la demande
  const { data: request, error: reqErr } = await supabase
    .from("subscription_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (reqErr || !request) {
    return { ok: false, error: "Demande introuvable." };
  }

  const duration = customDurationMonths || request.duration_months;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + duration);

  // 2. Met à jour la demande en 'approved'
  const { error: updateReqErr } = await supabase
    .from("subscription_requests")
    .update({
      status: "approved",
      duration_months: duration,
      admin_notes: adminNotes || request.admin_notes || "Validé après réception du transfert Mobile Money",
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateReqErr) {
    return { ok: false, error: "Erreur lors de la mise à jour de la demande." };
  }

  // 3. Met à jour ou insère l'abonnement de la boutique
  const { error: subErr } = await supabase
    .from("shop_subscriptions")
    .upsert(
      {
        shop_id: request.shop_id,
        plan_id: request.requested_plan_id,
        status: "active",
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        notes: `Validé par admin le ${new Date().toLocaleDateString("fr-FR")}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_id" }
    );

  if (subErr) {
    return { ok: false, error: "Erreur lors de l'activation de l'abonnement." };
  }

  revalidatePath("/admin");
  revalidatePath("/tableau-de-bord/abonnement");
  return { ok: true };
}

/**
 * Rejette une demande d'abonnement (ex. non paiement ou faux numéro).
 */
export async function rejectSubscriptionRequest(
  requestId: string,
  adminNotes: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getUser();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : rôle administrateur requis." };
  }

  const { error } = await supabase
    .from("subscription_requests")
    .update({
      status: "rejected",
      admin_notes: adminNotes || "Paiement non reçu ou référence incorrecte",
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    return { ok: false, error: "Erreur lors du rejet de la demande." };
  }

  revalidatePath("/admin");
  revalidatePath("/tableau-de-bord/abonnement");
  return { ok: true };
}

/**
 * Attribue ou prolonge manuellement l'abonnement d'une boutique depuis l'admin.
 */
export async function assignShopSubscriptionAction(
  shopId: string,
  planId: string,
  durationMonths: number | null,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : rôle administrateur requis." };
  }

  const { error } = await supabase.rpc("admin_assign_subscription", {
    p_shop_id: shopId,
    p_plan_id: planId,
    p_duration_months: durationMonths,
    p_notes: notes || null,
  });

  if (error) {
    return { ok: false, error: dbErrorMessage(error, "Erreur lors de l'attribution du forfait.") };
  }

  revalidatePath("/admin");
  revalidatePath("/tableau-de-bord/abonnement");
  return { ok: true };
}

/**
 * Résilie le forfait d'une boutique et la remet au forfait Gratuit (sans révoquer la certification).
 */
export async function cancelShopSubscriptionAction(
  shopId: string,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : rôle administrateur requis." };
  }

  const { error } = await supabase.rpc("admin_cancel_subscription", {
    p_shop_id: shopId,
    p_notes: notes || null,
  });

  if (error) {
    return { ok: false, error: dbErrorMessage(error, "Erreur lors de la résiliation du forfait.") };
  }

  revalidatePath("/admin");
  revalidatePath("/tableau-de-bord/abonnement");
  return { ok: true };
}

/**
 * Accorde ou révoque manuellement la certification d'une boutique.
 */
export async function toggleShopCertificationAction(
  shopId: string,
  isCertified: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : rôle administrateur requis." };
  }

  const { error } = await supabase.rpc("admin_toggle_certification", {
    p_shop_id: shopId,
    p_is_certified: isCertified,
  });

  if (error) {
    return { ok: false, error: dbErrorMessage(error, "Erreur lors de la modification de la certification.") };
  }

  revalidatePath("/admin");
  revalidatePath("/explorer");
  revalidatePath("/tableau-de-bord/abonnement");
  return { ok: true };
}

/**
 * Attribue ou prolonge manuellement l'abonnement d'une boutique depuis l'admin.
 */
export async function setShopSubscriptionManually(
  shopId: string,
  planId: string,
  durationMonths: number,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : rôle administrateur requis." };
  }

  let expiresAt: string | null = null;
  if (planId !== "gratuit") {
    const d = new Date();
    d.setMonth(d.getMonth() + durationMonths);
    expiresAt = d.toISOString();
  }

  const { error } = await supabase
    .from("shop_subscriptions")
    .upsert(
      {
        shop_id: shopId,
        plan_id: planId,
        status: "active",
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
        notes: notes || `Mis à jour manuellement par admin le ${new Date().toLocaleDateString("fr-FR")}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_id" }
    );

  if (error) {
    return { ok: false, error: "Erreur lors de la modification de l'abonnement." };
  }

  revalidatePath("/admin");
  revalidatePath("/tableau-de-bord/abonnement");
  return { ok: true };
}

/**
 * Ajoute un compte administrateur par email (quota maximum strict de 2 administrateurs).
 */
export async function addAdminAction(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : privilèges administrateur requis." };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { ok: false, error: "Veuillez renseigner une adresse email valide." };
  }

  const { data, error } = await supabase.rpc("admin_add_admin_by_email", {
    p_email: cleanEmail,
  });

  if (error) {
    return { ok: false, error: dbErrorMessage(error, "Erreur lors de l'ajout de l'administrateur.") };
  }

  const res = data as { ok: boolean; error?: string };
  if (!res.ok) {
    return { ok: false, error: res.error || "Impossible d'ajouter cet administrateur." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Révoque un compte administrateur (garantit qu'il reste au moins 1 administrateur).
 */
export async function removeAdminAction(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : privilèges administrateur requis." };
  }

  const { data, error } = await supabase.rpc("admin_remove_admin", {
    p_user_id: userId,
  });

  if (error) {
    return { ok: false, error: dbErrorMessage(error, "Erreur lors de la suppression.") };
  }

  const res = data as { ok: boolean; error?: string };
  if (!res.ok) {
    return { ok: false, error: res.error || "Impossible de supprimer cet administrateur." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Traite un signalement (masquer produit, suspendre boutique ou rejeter).
 */
export async function resolveReportAction(
  reportId: string,
  action: "hide_product" | "suspend_shop" | "dismiss",
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : privilèges administrateur requis." };
  }

  const { error } = await supabase.rpc("admin_resolve_report", {
    p_report_id: reportId,
    p_action: action,
    p_notes: notes || null,
  });

  if (error) {
    return { ok: false, error: dbErrorMessage(error, "Erreur lors du traitement du signalement.") };
  }

  revalidatePath("/admin");
  revalidatePath("/explorer");
  return { ok: true };
}

/**
 * Met à jour les paramètres d'un forfait (coefficient de visibilité, badge de certification).
 * Modifiable depuis l'admin sans toucher au code (Phase V3-C).
 */
export async function updateSubscriptionPlanAction(
  planId: string,
  visibilityMultiplier: number,
  hasCertifiedBadge: boolean,
  priceMonthly?: number | null,
  maxProducts?: number | null,
  maxOrdersPerMonth?: number | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : privilèges administrateur requis." };
  }

  const { error } = await supabase.rpc("admin_update_subscription_plan", {
    p_plan_id: planId,
    p_visibility_multiplier: visibilityMultiplier,
    p_has_certified_badge: hasCertifiedBadge,
    p_price_monthly: priceMonthly ?? null,
    p_max_products: maxProducts ?? null,
    p_max_orders_per_month: maxOrdersPerMonth ?? null,
  });

  if (error) {
    return { ok: false, error: dbErrorMessage(error, "Erreur lors de la mise à jour du forfait.") };
  }

  revalidatePath("/admin");
  revalidatePath("/tarifs");
  revalidatePath("/tableau-de-bord/abonnement");
  revalidatePath("/explorer");
  return { ok: true };
}

/**
 * Bascule la case « identité vérifiée » d'une boutique (Phase V3-C).
 */
export async function toggleShopIdentityVerifiedAction(
  shopId: string,
  identityVerified: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : privilèges administrateur requis." };
  }

  const { error } = await supabase.rpc("admin_toggle_identity_verified", {
    p_shop_id: shopId,
    p_identity_verified: identityVerified,
  });

  if (error) {
    return { ok: false, error: dbErrorMessage(error, "Erreur lors de la modification de l'identité vérifiée.") };
  }

  revalidatePath("/admin");
  revalidatePath("/explorer");
  revalidatePath("/tableau-de-bord/abonnement");
  return { ok: true };
}

/**
 * Enregistre un réglage global de la plateforme (ex: lien communauté WhatsApp) (Phase V3-C).
 */
export async function setPlatformSettingAction(
  key: string,
  value: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : privilèges administrateur requis." };
  }

  const { error } = await supabase.rpc("admin_set_platform_setting", {
    p_key: key,
    p_value: value.trim(),
  });

  if (error) {
    return { ok: false, error: dbErrorMessage(error, "Erreur lors de la mise à jour du réglage.") };
  }

  revalidatePath("/admin");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/compte");
  revalidatePath("/compte/parametres");
  return { ok: true };
}




/**
 * Valide ou rejette une demande de certification commerçant.
 */
export async function reviewCertificationAction(
  certificationId: string,
  status: "approved" | "rejected",
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Accès refusé : privilèges administrateur requis." };
  }

  const { error } = await supabase.rpc("admin_review_certification", {
    p_certification_id: certificationId,
    p_status: status,
    p_admin_notes: notes || null,
  });

  if (error) {
    return { ok: false, error: dbErrorMessage(error, "Erreur lors du traitement de la certification.") };
  }

  revalidatePath("/admin");
  revalidatePath("/explorer");
  return { ok: true };
}





