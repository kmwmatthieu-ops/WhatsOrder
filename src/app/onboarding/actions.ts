"use server";

import { revalidatePath } from "next/cache";
import { createClient, getMyShop, getUser } from "@/lib/supabase/server";
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

  // Si l'utilisateur connecté possède déjà ce slug, il est disponible pour lui
  if (user) {
    const { data: myShop } = await supabase
      .from("shops")
      .select("id, slug")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (myShop && myShop.slug === slug) {
      return { available: true };
    }
  }

  const { data, error } = await supabase.rpc("is_slug_available", { p_slug: slug });
  if (error) {
    // Si la vérification échoue temporairement, on ne bloque jamais l'utilisateur
    return { available: true };
  }
  return { available: Boolean(data) };
}

/**
 * Fin de l'étape 2 : crée la boutique. Si le compte en possède déjà une,
 * on ne crée rien et on renvoie vers le panneau « Vos boutiques ».
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

  // 1. Le compte possède déjà une boutique → aucune création.
  const { data: myShop, error: readError } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("[createShop] lecture boutique", readError);
    return { error: `Lecture de votre boutique impossible (${readError.code ?? "?"} : ${readError.message}).` };
  }
  if (myShop) {
    revalidatePath("/boutiques");
    return { ok: true, shopId: myShop.id, alreadyExists: true };
  }

  // 2. Création.
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
    // Message réel affiché (plus de message générique qui masque la cause).
    const friendly = dbErrorMessage(error, "Création de la boutique impossible.");
    return { error: `${friendly} (${error.code ?? "?"} : ${error.message})` };
  }

  revalidatePath("/tableau-de-bord", "layout");
  revalidatePath("/boutiques");
  return { ok: true, shopId: data.id };
}
