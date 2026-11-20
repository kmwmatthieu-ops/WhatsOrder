import { formatFCFA } from "./format";
import { formatPhone } from "./phone";

export type OrderSummaryForWhatsApp = {
  shopName: string;
  shopWhatsapp: string;
  publicCode: string;
  customerName: string;
  customerPhone: string;
  fulfillment: "delivery" | "pickup";
  deliveryAddress?: string | null;
  deliveryZoneName?: string | null;
  customerNote?: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: Array<{
    productName: string;
    unitPrice: number;
    quantity: number;
    selectedOptions?: string | null;
  }>;
};

/**
 * Génère le message WhatsApp prérempli envoyé par le client au commerçant.
 * Ce message est le cœur de l'expérience d'achat sur WhatsOrder.
 */
export function buildWhatsAppOrderMessage(order: OrderSummaryForWhatsApp): string {
  const isDelivery = order.fulfillment === "delivery";

  const lines: string[] = [];

  // Salutation & Code
  lines.push(`Bonjour *${order.shopName}*, voici ma commande *${order.publicCode}* :`);
  lines.push("");

  // Articles
  lines.push("🛒 *Articles :*");
  for (const item of order.items) {
    const optionsStr = item.selectedOptions ? ` (${item.selectedOptions})` : "";
    const itemTotal = item.unitPrice * item.quantity;
    lines.push(`• ${item.quantity}x ${item.productName}${optionsStr} — ${formatFCFA(itemTotal)}`);
  }
  lines.push("");

  // Mode de retrait / livraison
  lines.push(`📦 *Mode :* ${isDelivery ? "Livraison à domicile" : "Retrait en magasin"}`);
  if (isDelivery && order.deliveryAddress) {
    lines.push(`📍 *Adresse :* ${order.deliveryAddress}`);
  }

  // Tarification
  lines.push(`💰 *Sous-total :* ${formatFCFA(order.subtotal)}`);
  if (isDelivery && order.deliveryFee > 0) {
    const zoneStr = order.deliveryZoneName ? ` (${order.deliveryZoneName})` : "";
    lines.push(`🛵 *Frais de livraison :* ${formatFCFA(order.deliveryFee)}${zoneStr}`);
  }
  lines.push(`👉 *Total à payer :* ${formatFCFA(order.total)}`);
  lines.push("");

  // Coordonnées client
  lines.push(`👤 *Client :* ${order.customerName} (${formatPhone(order.customerPhone)})`);
  if (order.customerNote && order.customerNote.trim()) {
    lines.push(`📝 *Note :* ${order.customerNote.trim()}`);
  }

  return lines.join("\n");
}

/**
 * Génère l'URL d'ouverture WhatsApp (wa.me) avec le texte prérempli et encodé.
 */
export function getWhatsAppOrderUrl(order: OrderSummaryForWhatsApp): string {
  const cleanPhone = order.shopWhatsapp.replace(/\D/g, "");
  const text = buildWhatsAppOrderMessage(order);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
