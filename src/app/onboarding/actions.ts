"use server";

import { revalidatePath } from "next/cache";
import { createClient, getMyShop, getMyShops, getUser } from "@/lib/supabase/server";
import { createShopSchema } from "@/lib/validation/shop";
import { dbErrorMessage } from "@/lib/errors";
import { toFieldErrors, type ActionState } from "@/lib/action-state";
import { slugProblem, SLUG_PROBLEM_MESSAGES } from "@/lib/slug";

/**
 * Vérifie si l'utilisateur possède déjà une boutique existante.
 */
export async function checkUserShop(): Promise<{ hasShop: boolean }> {
  try {
    const user = await getUser();
    if (!user) return { hasShop: false };
    const shops = await getMyShops();
    if (shops.length > 0) return { hasShop: true };
    const shop = await getMyShop();
    return { hasShop: Boolean(shop) };
  } catch {
    return { hasShop: false };
  }
}

/**
 * Vérification de disponibilité du slug côté serveur :
 * Résout les problèmes de cross-origin / adblockers / permissions anonymes sur mobile.
 */
export async function checkSlugAvailability(
  slug: string
): Promise<{ available: boolean; problem?: string }> {
  const problem = slugProblem(slug);
  if (problem) return { available: false, problem: SLUG_PROBLEM_MESSAGES[problem] };

  const user = await getUser();
  const supabase = await createClient();

  if (user) {
    const myShop = await getMyShop();
    if (myShop && myShop.slug === slug) {
      return { available: true };
    }
  }

  const { data, error } = await supabase.rpc("is_slug_available", { p_slug: slug });
  if (error) {
    return { available: true };
  }
  return { available: Boolean(data) };
}

/**
 * Fin de l'étape 2 : crée la boutique en base puis laisse l'utilisateur
 * passer à l'étape 3 (Design : photo de profil / logo & couleur) avant d'entrer dans sa boutique.
 */
export async function createShop(input: {
  name: string;
  slug: string;
  whatsapp_number: string;
}): Promise<ActionState & { shopId?: string; alreadyExists?: boolean }> {
  const user = await getUser();
  if (!user) return { error: "Session expirée. Reconnectez-vous." };

  const parsed = createShopSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();

  // 1. Si le compte possède déjà une boutique, on renvoie son identifiant
  const myShop = await getMyShop();
  if (myShop) {
    return { ok: true, shopId: myShop.id, alreadyExists: true };
  }

  // 2. Création en base (pas de revalidatePath ici pour ne pas provoquer un re-rendu
  // anticipé qui éjecterait l'utilisateur de l'étape 3 de personnalisation).
  const { data, error } = await supabase
    .from("shops")
    .insert({ ...parsed.data, owner_id: user.id })
    .select("id")
    .single();

  if (error) {
    console.error("[createShop] insertion", error);
    if (error.code === "23505" && error.message.includes("owner_id")) {
      return { ok: true, alreadyExists: true };
    }
    if (error.code === "23505" && error.message.includes("slug")) {
      return { fieldErrors: { slug: "Ce lien de boutique est déjà pris. Choisissez-en un autre." } };
    }
    const friendly = dbErrorMessage(error, "Création de la boutique impossible.");
    return { error: `${friendly} (${error.code ?? "?"} : ${error.message})` };
  }

  return { ok: true, shopId: data.id };
}

/**
 * Fin de l'étape 3 : enregistre la couleur choisie lors du design de la boutique
 * et invalide le cache avant d'entrer directement dans /tableau-de-bord.
 */
export async function completeOnboardingDesign(primaryColor?: string): Promise<{ ok: boolean }> {
  try {
    const shop = await getMyShop();
    if (shop && primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
      const supabase = await createClient();
      await supabase
        .from("shops")
        .update({ primary_color: primaryColor })
        .eq("id", shop.id);
    }
  } catch {
    /* ignore */
  }
  revalidatePath("/tableau-de-bord", "layout");
  revalidatePath("/boutiques");
  return { ok: true };
}
