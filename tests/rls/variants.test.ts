import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isConfigured,
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  type TestContext,
} from "./helpers";

describe("V2-C — Variantes de produits (RLS, stock par variante et recalcul prix serveur)", () => {
  let ctx: TestContext;
  let productWithVariantsId: string;
  let productSimpleId: string;
  let variantLId: string;
  let variantXLId: string;
  let variantOutId: string;

  beforeAll(async () => {
    if (!isConfigured) return;
    const admin = getAdminClient();
    const anon = getAnonClient();
    const userA = await createTestUserWithShop(admin, "var_a");
    const userB = await createTestUserWithShop(admin, "var_b");
    ctx = { admin, userA, userB, anon };

    // 1. Produit simple (sans variante — rétrocompatibilité)
    const { data: pSimple, error: eSimple } = await userA.client
      .from("products")
      .insert({
        shop_id: userA.shopId,
        name: "Montre Simple",
        price: 10000,
        stock: 3,
      })
      .select("id")
      .single();
    if (eSimple) throw eSimple;
    productSimpleId = pSimple!.id;

    // 2. Produit avec variantes structurées
    const { data: pVar, error: eVar } = await userA.client
      .from("products")
      .insert({
        shop_id: userA.shopId,
        name: "T-Shirt Premium",
        price: 15000,
      })
      .select("id")
      .single();
    if (eVar) throw eVar;
    productWithVariantsId = pVar!.id;

    // Variante 1 : Taille L / Noir (prix de base 15 000 FCFA, stock 4)
    const { data: vL, error: eVL } = await userA.client
      .from("product_variants")
      .insert({
        product_id: productWithVariantsId,
        shop_id: userA.shopId,
        label: "L / Noir",
        attributes: { taille: "L", couleur: "Noir" },
        price_override: null,
        stock: 4,
        position: 0,
      })
      .select("id")
      .single();
    if (eVL) throw eVL;
    variantLId = vL!.id;

    // Variante 2 : Taille XL / Or (prix spécifique 18 500 FCFA, stock 2)
    const { data: vXL, error: eVXL } = await userA.client
      .from("product_variants")
      .insert({
        product_id: productWithVariantsId,
        shop_id: userA.shopId,
        label: "XL / Or",
        attributes: { taille: "XL", couleur: "Or" },
        price_override: 18500,
        stock: 2,
        position: 1,
      })
      .select("id")
      .single();
    if (eVXL) throw eVXL;
    variantXLId = vXL!.id;

    // Variante 3 : Taille S / Blanc (épuisée : stock = 0)
    const { data: vOut, error: eVOut } = await userA.client
      .from("product_variants")
      .insert({
        product_id: productWithVariantsId,
        shop_id: userA.shopId,
        label: "S / Blanc",
        attributes: { taille: "S", couleur: "Blanc" },
        price_override: null,
        stock: 0,
        position: 2,
      })
      .select("id")
      .single();
    if (eVOut) throw eVOut;
    variantOutId = vOut!.id;
  });

  afterAll(async () => {
    if (!isConfigured || !ctx) return;
    await cleanupTestUser(ctx.admin, ctx.userA.id);
    await cleanupTestUser(ctx.admin, ctx.userB.id);
  });

  it("empêche le commerçant B de modifier ou supprimer les variantes de A", async () => {
    if (!isConfigured) return;

    const { data: updated } = await ctx.userB.client
      .from("product_variants")
      .update({ price_override: 500 })
      .eq("id", variantXLId)
      .select();

    expect(updated?.length ?? 0).toBe(0);
  });

  it("exige une variante lorsqu'un produit possède des variantes", async () => {
    if (!isConfigured) return;

    const { error } = await ctx.anon.rpc("place_order", {
      p_shop_slug: ctx.userA.shopSlug,
      p_customer_name: "Client Test",
      p_customer_phone: "+24107000001",
      p_fulfillment: "pickup",
      p_delivery_address: null,
      p_customer_note: null,
      p_items: [
        {
          product_id: productWithVariantsId,
          quantity: 1,
          selected_options: null,
          variant_id: null,
        },
      ],
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("VARIANT_REQUIRED");
  });

  it("refuse la commande d'une combinaison épuisée (stock = 0)", async () => {
    if (!isConfigured) return;

    const { error } = await ctx.anon.rpc("place_order", {
      p_shop_slug: ctx.userA.shopSlug,
      p_customer_name: "Client Test",
      p_customer_phone: "+24107000002",
      p_fulfillment: "pickup",
      p_delivery_address: null,
      p_customer_note: null,
      p_items: [
        {
          product_id: productWithVariantsId,
          quantity: 1,
          selected_options: "S / Blanc",
          variant_id: variantOutId,
        },
      ],
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("INSUFFICIENT_STOCK");
  });

  it("recalcule le prix par variante côté serveur et décrémente le stock de la variante", async () => {
    if (!isConfigured) return;

    // Commande de 1x (L / Noir à 15 000) + 2x (XL / Or à 18 500) + 1x (Produit simple sans variante à 10 000)
    // Total attendu = 15000 + 2*18500 + 10000 = 62 000 FCFA
    const { data, error } = await ctx.anon.rpc("place_order", {
      p_shop_slug: ctx.userA.shopSlug,
      p_customer_name: "Client Variantes",
      p_customer_phone: "+24107000003",
      p_fulfillment: "pickup",
      p_delivery_address: null,
      p_customer_note: null,
      p_items: [
        {
          product_id: productWithVariantsId,
          quantity: 1,
          selected_options: null,
          variant_id: variantLId,
        },
        {
          product_id: productWithVariantsId,
          quantity: 2,
          selected_options: null,
          variant_id: variantXLId,
        },
        {
          product_id: productSimpleId,
          quantity: 1,
          selected_options: null,
          variant_id: null,
        },
      ],
    });

    expect(error).toBeNull();
    const res = data as { total: number; subtotal: number };
    expect(res.subtotal).toBe(62000);
    expect(res.total).toBe(62000);

    // Vérifier la décrémentation des stocks des variantes et du produit simple
    const { data: vL } = await ctx.userA.client
      .from("product_variants")
      .select("stock")
      .eq("id", variantLId)
      .single();
    expect(vL?.stock).toBe(3);

    const { data: vXL } = await ctx.userA.client
      .from("product_variants")
      .select("stock")
      .eq("id", variantXLId)
      .single();
    expect(vXL?.stock).toBe(0);

    const { data: pSimple } = await ctx.userA.client
      .from("products")
      .select("stock")
      .eq("id", productSimpleId)
      .single();
    expect(pSimple?.stock).toBe(2);
  });
});
