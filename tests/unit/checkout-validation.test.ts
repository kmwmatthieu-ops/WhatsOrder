import { describe, it, expect } from "vitest";
import { checkoutSchema } from "@/lib/validation/checkout";

describe("Validation du formulaire de commande (sans inscription)", () => {
  const dummyProductId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  it("valide une commande complète en livraison", () => {
    const validData = {
      customer_name: "Kouamé Jean",
      customer_phone: "+2250102030405",
      fulfillment: "delivery",
      delivery_address: "Yopougon Maroc, Abidjan",
      customer_note: "En face de la pharmacie",
      items: [
        {
          product_id: dummyProductId,
          quantity: 2,
          selected_options: "Bleu",
        },
      ],
    };

    const res = checkoutSchema.safeParse(validData);
    expect(res.success).toBe(true);
  });

  it("refuse une commande en livraison sans adresse de livraison", () => {
    const invalidData = {
      customer_name: "Kouamé Jean",
      customer_phone: "+2250102030405",
      fulfillment: "delivery",
      delivery_address: "",
      items: [
        {
          product_id: dummyProductId,
          quantity: 1,
        },
      ],
    };

    const res = checkoutSchema.safeParse(invalidData);
    expect(res.success).toBe(false);
  });

  it("accepte une commande en retrait en magasin sans adresse", () => {
    const validPickup = {
      customer_name: "Kouamé Jean",
      customer_phone: "+2250102030405",
      fulfillment: "pickup",
      items: [
        {
          product_id: dummyProductId,
          quantity: 1,
        },
      ],
    };

    const res = checkoutSchema.safeParse(validPickup);
    expect(res.success).toBe(true);
  });

  it("bloque les soumissions avec honeypot rempli (anti-spam bot)", () => {
    const spammedData = {
      customer_name: "Spam Bot",
      customer_phone: "+2250102030405",
      fulfillment: "pickup",
      honeypot: "http://spam-link.com",
      items: [
        {
          product_id: dummyProductId,
          quantity: 1,
        },
      ],
    };

    const res = checkoutSchema.safeParse(spammedData);
    expect(res.success).toBe(false);
  });
});
