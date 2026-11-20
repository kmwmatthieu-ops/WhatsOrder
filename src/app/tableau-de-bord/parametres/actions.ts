"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/supabase/server";
import { updateShopSchema } from "@/lib/validation/shop";
import { dbErrorMessage } from "@/lib/errors";
import { toFieldErrors, type ActionState } from "@/lib/action-state";
import { mediaPathFromUrl } from "@/lib/storage";
import { MEDIA_BUCKET } from "@/lib/constants";

export async function updateShopSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { shop, supabase } = await requireShop();

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
  return {};
}
