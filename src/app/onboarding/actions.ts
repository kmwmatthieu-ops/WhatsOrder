"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { createShopSchema } from "@/lib/validation/shop";
import { dbErrorMessage } from "@/lib/errors";
import { toFieldErrors, type ActionState } from "@/lib/action-state";

/** Fin de l'étape 2 : crée la boutique (nom, lien, WhatsApp). */
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
  const { data, error } = await supabase
    .from("shops")
    .insert({ ...parsed.data, owner_id: user.id })
    .select("id")
    .single();

  if (error) {
    const message = dbErrorMessage(error, "Création de la boutique impossible. Réessayez.");
    // Erreur de lien pris → renvoyée sur le champ concerné (retour étape 1).
    if (error.code === "23505" && error.message.includes("slug")) return { fieldErrors: { slug: message } };
    return { error: message };
  }

  revalidatePath("/tableau-de-bord", "layout");
  return { ok: true, shopId: data.id };
}
