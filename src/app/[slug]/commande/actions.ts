"use server";

import { createClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validation/checkout";
import { toFieldErrors, type ActionState } from "@/lib/action-state";
import { dbErrorMessage } from "@/lib/errors";

export type OrderPlacementResult = ActionState & {
  publicCode?: string;
};

export async function submitOrder(
  shopSlug: string,
  _prev: OrderPlacementResult,
  formData: FormData
): Promise<OrderPlacementResult> {
  const honeypot = String(formData.get("hp_check") ?? "");
  if (honeypot.length > 0) {
    // Spam bot détecté
    return { error: "Activité suspecte détectée." };
  }

  const itemsRaw = formData.get("items_json");
  let items = [];
  try {
    items = itemsRaw ? JSON.parse(String(itemsRaw)) : [];
  } catch {
    return { error: "Panier invalide." };
  }

  const rawData = {
    customer_name: formData.get("customer_name"),
    customer_phone: formData.get("customer_phone"),
    fulfillment: formData.get("fulfillment"),
    delivery_address: formData.get("delivery_address"),
    customer_note: formData.get("customer_note"),
    items,
  };

  const parsed = checkoutSchema.safeParse(rawData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const supabase = await createClient();

  // Appel de la fonction transactionnelle sécurisée place_order
  const { data, error } = await supabase.rpc("place_order", {
    p_shop_slug: shopSlug,
    p_customer_name: parsed.data.customer_name,
    p_customer_phone: parsed.data.customer_phone,
    p_fulfillment: parsed.data.fulfillment,
    p_delivery_address: parsed.data.delivery_address ?? null,
    p_customer_note: parsed.data.customer_note ?? null,
    p_items: parsed.data.items.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      selected_options: i.selected_options ?? null,
    })),
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("INSUFFICIENT_STOCK")) {
      return { error: "Un article de votre panier n'a plus assez de stock disponible." };
    }
    if (msg.includes("PRODUCT_UNAVAILABLE")) {
      return { error: "Un article de votre panier n'est plus disponible." };
    }
    return { error: dbErrorMessage(error, "Impossible de valider votre commande. Veuillez réessayer.") };
  }

  const result = data as { public_code: string };

  return {
    ok: true,
    publicCode: result.public_code,
  };
}
