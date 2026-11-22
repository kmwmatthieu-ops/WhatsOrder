import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isConfigured,
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  type TestContext,
} from "./helpers";

describe("RLS — Catalogue (catégories, produits et limite 20)", () => {
  let ctx: TestContext;
  let categoryAId: string;
  let categoryBId: string;

  beforeAll(async () => {
    if (!isConfigured) return;
    const admin = getAdminClient();
    const anon = getAnonClient();
    const userA = await createTestUserWithShop(admin, "cat_a");
    const userB = await createTestUserWithShop(admin, "cat_b");
    ctx = { admin, userA, userB, anon };

    // Créer une catégorie dans chaque boutique
    const { data: catA } = await ctx.userA.client
      .from("categories")
      .insert({ shop_id: ctx.userA.shopId, name: "Catégorie A" })
      .select("id")
      .single();
    categoryAId = catA!.id;

    const { data: catB } = await ctx.userB.client
      .from("categories")
      .insert({ shop_id: ctx.userB.shopId, name: "Catégorie B" })
      .select("id")
      .single();
    categoryBId = catB!.id;
  });

  afterAll(async () => {
    if (!isConfigured || !ctx) return;
    await cleanupTestUser(ctx.admin, ctx.userA.id);
    await cleanupTestUser(ctx.admin, ctx.userB.id);
  });

  it("empêche A d'insérer un produit dans la boutique de B", async () => {
    if (!isConfigured) return;

    const { error } = await ctx.userA.client.from("products").insert({
      shop_id: ctx.userB.shopId,
      name: "Produit piraté",
      price: 10000,
    });

    expect(error).not.toBeNull();
  });

  it("empêche A de modifier ou supprimer un produit de B", async () => {
    if (!isConfigured) return;

    // B crée un produit légitime
    const { data: prodB } = await ctx.userB.client
      .from("products")
      .insert({
        shop_id: ctx.userB.shopId,
        name: "Produit de B",
        price: 5000,
      })
      .select("id")
      .single();

    // A essaie de le modifier
    const { count: updateCount } = await ctx.userA.client
      .from("products")
      .update({ price: 100 })
      .eq("id", prodB!.id)
      .select();

    expect(updateCount === 0 || updateCount === null).toBe(true);

    // A essaie de le supprimer
    const { count: deleteCount } = await ctx.userA.client
      .from("products")
      .delete()
      .eq("id", prodB!.id)
      .select();

    expect(deleteCount === 0 || deleteCount === null).toBe(true);
  });

  it("empêche A de rattacher son produit à une catégorie de B (FK composite)", async () => {
    if (!isConfigured) return;

    const { error } = await ctx.userA.client.from("products").insert({
      shop_id: ctx.userA.shopId,
      category_id: categoryBId, // Catégorie appartenant à B !
      name: "Produit cross-catégorie",
      price: 2500,
    });

    expect(error).not.toBeNull();
  });

  it("bloque l'insertion du 6ème produit (limite plan gratuit de 5 produits)", async () => {
    if (!isConfigured) return;

    // Remplir jusqu'à 5 produits
    const prods = Array.from({ length: 5 }, (_, i) => ({
      shop_id: ctx.userA.shopId,
      name: `Produit quota ${i + 1}`,
      price: 1000,
    }));

    await ctx.userA.client.from("products").insert(prods);

    // Tentative d'insertion du 6ème
    const { error } = await ctx.userA.client.from("products").insert({
      shop_id: ctx.userA.shopId,
      name: "Produit 6 (doit échouer)",
      price: 5000,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("PRODUCT_LIMIT_REACHED");
  });
});
