"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validation/checkout";
import { toFieldErrors, type ActionState } from "@/lib/action-state";
import { dbErrorMessage } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { isShopCurrentlyOpen } from "@/lib/opening-hours";
import type { OpeningHours } from "@/types/database";

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
    return { error: "Activité suspecte détectée." };
  }

  // Rate Limiting par adresse IP (max 5 commandes / 10 min)
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "127.0.0.1";
  const ipRateLimit = checkRateLimit(`ip:${ip}`, 5, 10 * 60 * 1000);
  if (!ipRateLimit.success) {
    return { error: "Trop de commandes envoyées récemment. Veuillez patienter quelques minutes avant de renouveler." };
  }

  const supabase = await createClient();

  // Vérification que la boutique est active et actuellement ouverte
  const { data: shopData } = await supabase
    .from("shops")
    .select("id, status, opening_hours, whatsapp_number")
    .eq("slug", shopSlug)
    .maybeSingle();

  if (!shopData || shopData.status !== "active") {
    return { error: "Cette boutique n'est pas disponible actuellement." };
  }

  const openStatus = isShopCurrentlyOpen(
    shopData.opening_hours as OpeningHours | null,
    new Date(),
    shopData.whatsapp_number
  );

  if (!openStatus.isOpen) {
    return {
      error: `Cette boutique est actuellement fermée (${openStatus.dayLabel} : ${openStatus.hoursText}). Vous ne pouvez pas passer commande en dehors des horaires d'ouverture.`,
    };
  }

  const itemsRaw = formData.get("items_json");
  let items = [];
  try {
    items = itemsRaw ? JSON.parse(String(itemsRaw)) : [];
  } catch {
    return { error: "Panier invalide." };
  }

  const deliveryZoneIdRaw = formData.get("delivery_zone_id");
  const delivery_zone_id = deliveryZoneIdRaw ? String(deliveryZoneIdRaw) : null;

  const rawData = {
    customer_name: formData.get("customer_name"),
    customer_phone: formData.get("customer_phone"),
    fulfillment: formData.get("fulfillment"),
    delivery_address: formData.get("delivery_address"),
    delivery_zone_id,
    customer_note: formData.get("customer_note"),
    items,
  };

  const parsed = checkoutSchema.safeParse(rawData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

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
      variant_id: i.variant_id ?? null,
    })),
    p_delivery_zone_id: parsed.data.delivery_zone_id ?? null,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("INSUFFICIENT_STOCK")) {
      return { error: "Un article ou une variante de votre panier n'a plus assez de stock disponible." };
    }
    if (msg.includes("PRODUCT_UNAVAILABLE") || msg.includes("VARIANT_UNAVAILABLE")) {
      return { error: "Un article ou une variante de votre panier n'est plus disponible." };
    }
    if (msg.includes("VARIANT_REQUIRED")) {
      return { error: "Veuillez sélectionner une variante (taille, couleur, modèle) pour chaque article." };
    }
    if (msg.includes("DELIVERY_ZONE_REQUIRED")) {
      return { error: "Veuillez sélectionner votre zone de livraison." };
    }
    if (msg.includes("INVALID_DELIVERY_ZONE")) {
      return { error: "La zone de livraison sélectionnée n'est plus valide." };
    }
    return { error: dbErrorMessage(error, "Impossible de valider votre commande. Veuillez réessayer.") };
  }

  const result = data as { public_code: string };

  return {
    ok: true,
    publicCode: result.public_code,
  };
}
