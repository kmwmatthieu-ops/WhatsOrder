"use server";

import { revalidatePath } from "next/cache";
import { requireShop, getUser, createClient } from "@/lib/supabase/server";
import { updateShopSchema } from "@/lib/validation/shop";
import { dbErrorMessage } from "@/lib/errors";
import { toFieldErrors, type ActionState } from "@/lib/action-state";
import { mediaPathFromUrl } from "@/lib/storage";
import { MEDIA_BUCKET } from "@/lib/constants";
import { getShopSubscription } from "@/lib/subscription";
import type { DeliveryZone } from "@/types/database";

export async function updateShopSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { shop, supabase } = await requireShop();

  const openingHoursRaw = formData.get("opening_hours");
  let opening_hours;
  if (openingHoursRaw) {
    try {
      opening_hours = JSON.parse(String(openingHoursRaw));
    } catch {
      // ignore
    }
  }

  const rawData = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    whatsapp_number: formData.get("whatsapp_number"),
    description: formData.get("description"),
    address: formData.get("address"),
    primary_color: formData.get("primary_color"),
    delivery_fee: formData.get("delivery_fee"),
    delivery_enabled: formData.get("delivery_enabled") === "on",
    pickup_enabled: formData.get("pickup_enabled") === "on",
    is_listed_in_explorer: formData.get("is_listed_in_explorer") === "on",
    ...(opening_hours ? { opening_hours } : {}),
  };

  const parsed = updateShopSchema.safeParse(rawData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const { error } = await supabase
    .from("shops")
    .update(parsed.data)
    .eq("id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error, "Impossible d'enregistrer les paramètres.") };
  }

  revalidatePath("/tableau-de-bord", "layout");
  revalidatePath("/tableau-de-bord/parametres");
  revalidatePath(`/${parsed.data.slug}`);
  return { ok: true, message: "Paramètres enregistrés avec succès !" };
}

export async function removeLogo(): Promise<{ error?: string }> {
  const { shop, supabase } = await requireShop();
  if (!shop.logo_url) return {};

  const oldPath = mediaPathFromUrl(shop.logo_url);
  const { error } = await supabase.from("shops").update({ logo_url: null }).eq("id", shop.id);
  if (error) return { error: dbErrorMessage(error) };

  if (oldPath) {
    await supabase.storage.from(MEDIA_BUCKET).remove([oldPath]);
  }

  revalidatePath("/tableau-de-bord", "layout");
  revalidatePath(`/${shop.slug}`);
  return {};
}

export async function removeBanner(): Promise<{ error?: string }> {
  const { shop, supabase } = await requireShop();
  if (!shop.banner_url) return {};

  const oldPath = mediaPathFromUrl(shop.banner_url);
  const { error } = await supabase.from("shops").update({ banner_url: null }).eq("id", shop.id);
  if (error) return { error: dbErrorMessage(error) };

  if (oldPath) {
    await supabase.storage.from(MEDIA_BUCKET).remove([oldPath]);
  }

  revalidatePath("/tableau-de-bord", "layout");
  revalidatePath("/tableau-de-bord/parametres");
  revalidatePath(`/${shop.slug}`);
  return {};
}

export async function createDeliveryZone(
  formData: FormData
): Promise<{ error?: string; zone?: DeliveryZone }> {
  const { shop, supabase } = await requireShop();

  const name = String(formData.get("name") ?? "").trim();
  const fee = parseInt(String(formData.get("fee") ?? "0"), 10);

  if (!name || name.length > 60) {
    return { error: "Le nom de la zone doit comporter entre 1 et 60 caractères." };
  }
  if (isNaN(fee) || fee < 0) {
    return { error: "Les frais de livraison doivent être un montant positif ou nul." };
  }

  const { data, error } = await supabase
    .from("delivery_zones")
    .insert({
      shop_id: shop.id,
      name,
      fee,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Une zone avec ce nom existe déjà." };
    }
    return { error: dbErrorMessage(error, "Impossible de créer la zone de livraison.") };
  }

  revalidatePath("/tableau-de-bord/parametres");
  revalidatePath(`/${shop.slug}/commande`);
  return { zone: data as DeliveryZone };
}

export async function updateDeliveryZone(
  zoneId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const { shop, supabase } = await requireShop();

  const name = String(formData.get("name") ?? "").trim();
  const fee = parseInt(String(formData.get("fee") ?? "0"), 10);

  if (!name || name.length > 60) {
    return { error: "Le nom de la zone doit comporter entre 1 et 60 caractères." };
  }
  if (isNaN(fee) || fee < 0) {
    return { error: "Les frais de livraison doivent être un montant positif ou nul." };
  }

  const { error } = await supabase
    .from("delivery_zones")
    .update({ name, fee })
    .eq("id", zoneId)
    .eq("shop_id", shop.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Une zone avec ce nom existe déjà." };
    }
    return { error: dbErrorMessage(error, "Impossible de modifier la zone de livraison.") };
  }

  revalidatePath("/tableau-de-bord/parametres");
  revalidatePath(`/${shop.slug}/commande`);
  return {};
}

export async function deleteDeliveryZone(zoneId: string): Promise<{ error?: string }> {
  const { shop, supabase } = await requireShop();

  const { error } = await supabase
    .from("delivery_zones")
    .delete()
    .eq("id", zoneId)
    .eq("shop_id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error, "Impossible de supprimer la zone de livraison.") };
  }

  revalidatePath("/tableau-de-bord/parametres");
  revalidatePath(`/${shop.slug}/commande`);
  return {};
}

/**
 * Supprime définitivement la boutique et toutes ses données associées (cascade PostgreSQL),
 * ainsi que ses fichiers d'images hébergés.
 * Le compte auth.users de l'utilisateur reste actif pour lui permettre de créer une nouvelle boutique.
 */
export async function deleteShop(
  shopId: string,
  confirmationName: string
): Promise<{ ok?: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };

  const supabase = await createClient();

  // 1. Récupérer la boutique pour valider la propriété et le nom
  const { data: shop, error: fetchError } = await supabase
    .from("shops")
    .select("id, name, slug, owner_id")
    .eq("id", shopId)
    .single();

  if (fetchError || !shop) {
    return { error: "Boutique introuvable ou accès refusé." };
  }

  // 2. Vérification stricte du nom de confirmation
  if (confirmationName.trim().toLowerCase() !== shop.name.trim().toLowerCase()) {
    return {
      error: `Veuillez saisir exactement « ${shop.name} » pour confirmer la suppression définitive.`,
    };
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
    // Échec de nettoyage non bloquant
  }

  // 4. Suppression en base (cascade PostgreSQL vers toutes les tables enfants)
  const { error: deleteError } = await supabase
    .from("shops")
    .delete()
    .eq("id", shop.id);

  if (deleteError) {
    return { error: dbErrorMessage(deleteError, "Impossible de supprimer la boutique.") };
  }

  // 5. Invalidation des chemins et caches Next.js
  revalidatePath("/tableau-de-bord", "layout");
  revalidatePath("/boutiques");
  revalidatePath("/onboarding");
  revalidatePath(`/${shop.slug}`);

  return { ok: true };
}

/**
 * Modifie le mot de passe du commerçant connecté (avec vérification de l'actuel).
 */
export async function updateAccountPassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser();
  if (!user || !user.email) return { error: "Non authentifié." };

  const currentPassword = String(formData.get("current_password") || "");
  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!currentPassword) return { error: "Veuillez saisir votre mot de passe actuel." };
  if (!newPassword || newPassword.length < 8) {
    return { error: "Le nouveau mot de passe doit comporter au moins 8 caractères." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Les deux nouveaux mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();

  // 1. Vérification du mot de passe actuel
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInErr) {
    return { error: "Le mot de passe actuel est incorrect." };
  }

  // 2. Mise à jour
  const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
  if (updateErr) {
    return { error: "Impossible de modifier le mot de passe. Réessayez." };
  }

  return { ok: true, message: "Votre mot de passe a été modifié avec succès." };
}

/**
 * Modifie l'adresse e-mail du commerçant (avec confirmation).
 */
export async function updateAccountEmail(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };

  const newEmail = String(formData.get("new_email") || "").trim().toLowerCase();
  if (!newEmail || !newEmail.includes("@")) {
    return { error: "Veuillez saisir une adresse e-mail valide." };
  }
  if (newEmail === user.email?.toLowerCase()) {
    return { error: "Cette adresse e-mail est déjà celle de votre compte." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    return { error: "Impossible de modifier l'adresse e-mail. Vérifiez qu'elle n'est pas déjà utilisée." };
  }

  return {
    ok: true,
    message: `Un e-mail de confirmation a été envoyé à ${newEmail}. Veuillez cliquer sur le lien reçu pour valider la nouvelle adresse.`,
  };
}

/**
 * Supprime définitivement le compte du commerçant et toutes ses données en cascade.
 */
export async function deleteMyAccount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser();
  if (!user || !user.email) return { error: "Non authentifié." };

  const password = String(formData.get("password") || "");
  if (!password) {
    return { error: "Veuillez saisir votre mot de passe pour confirmer la suppression." };
  }

  const supabase = await createClient();

  // 1. Vérification obligatoire du mot de passe
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (authErr) {
    return { error: "Mot de passe incorrect. La suppression a été annulée." };
  }

  // 2. Appel de la fonction SQL sécurisée
  const { error: rpcErr } = await supabase.rpc("delete_user_account");
  if (rpcErr) {
    console.error("Erreur delete_user_account:", rpcErr);
    return { error: "Erreur lors de la suppression de votre compte." };
  }

  // 3. Déconnexion
  await supabase.auth.signOut();

  return { ok: true, message: "REDIRECT_LOGIN" };
}

/**
 * Active ou désactive la réception d'e-mails à chaque nouvelle commande.
 * Règle d) : Le droit est vérifié côté serveur (réservé aux forfaits avec has_order_email_notifications).
 */
export async function toggleOrderEmailNotificationPref(
  enabled: boolean
): Promise<{ ok?: boolean; error?: string }> {
  const { shop, supabase } = await requireShop();

  // Vérification stricte du droit de forfait côté serveur
  const subscription = await getShopSubscription(shop.id);
  if (!subscription.effectivePlan.has_order_email_notifications) {
    return {
      error: "Cette fonctionnalité est réservée aux forfaits Business et Premium. Mettez à niveau votre forfait pour l'activer.",
    };
  }

  const { error } = await supabase
    .from("shops")
    .update({ order_notifications_enabled: enabled })
    .eq("id", shop.id);

  if (error) {
    return { error: "Impossible d'enregistrer la préférence de notification." };
  }

  revalidatePath("/tableau-de-bord/parametres");
  return { ok: true };
}
