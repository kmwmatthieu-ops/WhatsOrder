"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { createShopSchema } from "@/lib/validation/shop";
import { dbErrorMessage } from "@/lib/errors";
import { toFieldErrors, type ActionState } from "@/lib/action-state";
import { slugProblem, SLUG_PROBLEM_MESSAGES } from "@/lib/slug";

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
 * Fin de l'étape 2 : crée ou met à jour la boutique (nom, lien, WhatsApp).
 * Gère de manière transparente la reprise d'onboarding sans erreur de duplication.
 */
export async function createShop(input: {
  name: string;
  slug: string;
  whatsapp_number: string;
}): Promise<ActionState & { shopId?: string }> {
  const user = await getUser();
  if (!user) return { error: "Session expirée. Reconnectez-vous." };

  const parsed = createShopSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();

  // 1. Vérifier si l'utilisateur possède déjà une boutique
  const { data: existingShop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existingShop) {
    // Si la boutique existe déjà, on applique la mise à jour sans bloquer,
    // et on valide avec succès pour amener directement au tableau de bord / boutiques.
    try {
      await supabase
        .from("shops")
        .update(parsed.data)
        .eq("id", existingShop.id);
    } catch {
      // Ignorer l'erreur non critique de mise à jour
    }

    revalidatePath("/tableau-de-bord", "layout");
    revalidatePath("/boutiques");
    return { ok: true, shopId: existingShop.id };
  }

  // 2. Première création : insertion
  const { data, error } = await supabase
    .from("shops")
    .insert({ ...parsed.data, owner_id: user.id })
    .select("id")
    .single();

  if (error) {
    // Si l'utilisateur possède déjà une boutique (violation de la contrainte unique owner_id)
    if (error.code === "23505" && error.message.includes("owner_id")) {
      revalidatePath("/tableau-de-bord", "layout");
      revalidatePath("/boutiques");
      return { ok: true };
    }

    const message = dbErrorMessage(error, "Création de la boutique impossible. Réessayez.");
    if (error.code === "23505" && error.message.includes("slug")) {
      return { fieldErrors: { slug: message } };
    }
    return { error: message };
  }

  revalidatePath("/tableau-de-bord", "layout");
  return { ok: true, shopId: data.id };
}
