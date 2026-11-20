import { describe, it, expect } from "vitest";
import { buildWhatsAppOrderMessage, getWhatsAppOrderUrl, type OrderSummaryForWhatsApp } from "@/lib/whatsapp";

describe("Générateur de message WhatsApp (cœur du produit)", () => {
  const sampleOrder: OrderSummaryForWhatsApp = {
    shopName: "Chez Awa",
    shopWhatsapp: "+2250701020304",
    publicCode: "CMD-A7K2",
    customerName: "Marie Koné",
    customerPhone: "+2250705060708",
    fulfillment: "delivery",
    deliveryAddress: "Cocody Angré, Abidjan",
    customerNote: "Appeler à l'arrivée svp.",
    subtotal: 40000,
    deliveryFee: 1500,
    total: 41500,
    items: [
      {
        productName: "Robe d'été fleurie",
        unitPrice: 12500,
        quantity: 2,
        selectedOptions: "Taille M, Rouge",
      },
      {
        productName: "Sac à main cuir",
        unitPrice: 15000,
        quantity: 1,
        selectedOptions: null,
      },
    ],
  };

  it("génère un message lisible et parfaitement structuré en FCFA", () => {
    const msg = buildWhatsAppOrderMessage(sampleOrder);

    expect(msg).toContain("Bonjour *Chez Awa*, voici ma commande *CMD-A7K2* :");
    expect(msg).toContain("🛒 *Articles :*");
    expect(msg).toContain("• 2x Robe d'été fleurie (Taille M, Rouge) — 25\u00A0000\u00A0FCFA");
    expect(msg).toContain("• 1x Sac à main cuir — 15\u00A0000\u00A0FCFA");
    expect(msg).toContain("📦 *Mode :* Livraison à domicile");
    expect(msg).toContain("📍 *Adresse :* Cocody Angré, Abidjan");
    expect(msg).toContain("💰 *Sous-total :* 40\u00A0000\u00A0FCFA");
    expect(msg).toContain("🛵 *Frais de livraison :* 1\u00A0500\u00A0FCFA");
    expect(msg).toContain("👉 *Total à payer :* 41\u00A0500\u00A0FCFA");
    expect(msg).toContain("👤 *Client :* Marie Koné (+225 07 05 06 07 08)");
    expect(msg).toContain("📝 *Note :* Appeler à l'arrivée svp.");
  });

  it("affiche le nom de la zone de livraison lorsque configurée", () => {
    const zonedOrder: OrderSummaryForWhatsApp = {
      ...sampleOrder,
      deliveryZoneName: "Zone Cocody",
      deliveryFee: 2000,
      total: 42000,
    };

    const msg = buildWhatsAppOrderMessage(zonedOrder);
    expect(msg).toContain("🛵 *Frais de livraison :* 2\u00A0000\u00A0FCFA (Zone Cocody)");
  });

  it("s'adapte au mode retrait en magasin sans afficher de frais ni d'adresse", () => {
    const pickupOrder: OrderSummaryForWhatsApp = {
      ...sampleOrder,
      fulfillment: "pickup",
      deliveryAddress: null,
      deliveryFee: 0,
      total: 40000,
      customerNote: null,
    };

    const msg = buildWhatsAppOrderMessage(pickupOrder);

    expect(msg).toContain("📦 *Mode :* Retrait en magasin");
    expect(msg).not.toContain("📍 *Adresse :*");
    expect(msg).not.toContain("🛵 *Frais de livraison :*");
    expect(msg).not.toContain("📝 *Note :*");
    expect(msg).toContain("👉 *Total à payer :* 40\u00A0000\u00A0FCFA");
  });

  it("génère une URL wa.me valide et sécurisée", () => {
    const url = getWhatsAppOrderUrl(sampleOrder);

    expect(url.startsWith("https://wa.me/2250701020304?text=")).toBe(true);
    expect(url).toContain(encodeURIComponent("CMD-A7K2"));
  });
});
