"use server";

import { revalidatePath } from "next/cache";
import { requireShop, getUser, createClient } from "@/lib/supabase/server";
import { updateShopSchema } from "@/lib/validation/shop";
import { dbErrorMessage } from "@/lib/errors";
import { toFieldErrors, type ActionState } from "@/lib/action-state";
import { mediaPathFromUrl } from "@/lib/storage";
import { MEDIA_BUCKET } from "@/lib/constants";
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
