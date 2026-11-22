"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";

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


