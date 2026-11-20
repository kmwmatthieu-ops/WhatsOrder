"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";

export async function updateCustomerNotes(
  customerId: string,
  notes: string | null
): Promise<{ error?: string }> {
  const { shop, supabase } = await requireShop();

  const cleanNotes = notes ? notes.trim() : null;
  if (cleanNotes && cleanNotes.length > 2000) {
    return { error: "Les notes ne peuvent pas dépasser 2000 caractères." };
  }

  const { error } = await supabase
    .from("customers")
    .update({ notes: cleanNotes })
    .eq("id", customerId)
    .eq("shop_id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error, "Impossible d'enregistrer les notes.") };
  }

  revalidatePath(`/tableau-de-bord/clients/${customerId}`);
  return {};
}
