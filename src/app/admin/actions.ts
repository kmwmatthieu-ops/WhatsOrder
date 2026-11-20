"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
