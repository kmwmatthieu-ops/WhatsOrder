import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isConfigured,
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  type TestContext,
} from "./helpers";

describe("RLS — Isolation des Boutiques (shops)", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    if (!isConfigured) return;
    const admin = getAdminClient();
    const anon = getAnonClient();
    const userA = await createTestUserWithShop(admin, "a");
    const userB = await createTestUserWithShop(admin, "b");
    ctx = { admin, userA, userB, anon };
  });

  afterAll(async () => {
    if (!isConfigured || !ctx) return;
    await cleanupTestUser(ctx.admin, ctx.userA.id);
    await cleanupTestUser(ctx.admin, ctx.userB.id);
  });

  it("empêche le commerçant A de modifier la boutique du commerçant B", async () => {
    if (!isConfigured) return;

    const { error, count } = await ctx.userA.client
      .from("shops")
      .update({ name: "Piraté par A" })
      .eq("id", ctx.userB.shopId)
      .select();

    // RLS : soit 0 ligne affectée (non visible à l'update), soit erreur
    expect(count === 0 || count === null || error !== null).toBe(true);

    // Vérifier que le nom n'a pas changé
    const { data: shopB } = await ctx.admin
      .from("shops")
      .select("name")
      .eq("id", ctx.userB.shopId)
      .single();
    expect(shopB?.name).not.toBe("Piraté par A");
  });

  it("empêche un commerçant de créer une deuxième boutique (1 boutique max)", async () => {
    if (!isConfigured) return;

    const { error } = await ctx.userA.client.from("shops").insert({
      owner_id: ctx.userA.id,
      name: "Deuxième boutique interdite",
      slug: `second-shop-${Date.now().toString(36)}`,
      whatsapp_number: "+2250700000002",
    });

    expect(error).not.toBeNull();
  });

  it("empêche un commerçant de modifier le statut de sa boutique (réservé admin)", async () => {
    if (!isConfigured) return;

    const { error } = await ctx.userA.client
      .from("shops")
      .update({ status: "suspended" })
      .eq("id", ctx.userA.shopId);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("FORBIDDEN_STATUS_CHANGE");
  });

  it("permet au public (anonyme) de lire une boutique active", async () => {
    if (!isConfigured) return;

    const { data, error } = await ctx.anon
      .from("shops")
      .select("id, name, slug, status")
      .eq("id", ctx.userA.shopId)
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(ctx.userA.shopId);
  });

  it("masque les boutiques suspendues au public", async () => {
    if (!isConfigured) return;

    // Suspendre via admin
    await ctx.admin.from("shops").update({ status: "suspended" }).eq("id", ctx.userB.shopId);

    const { data } = await ctx.anon
      .from("shops")
      .select("id")
      .eq("id", ctx.userB.shopId)
      .maybeSingle();

    expect(data).toBeNull();

    // Rétablir active
    await ctx.admin.from("shops").update({ status: "active" }).eq("id", ctx.userB.shopId);
  });

  it("empêche le commerçant A de supprimer la boutique du commerçant B", async () => {
    if (!isConfigured) return;

    const { error, count } = await ctx.userA.client
      .from("shops")
      .delete({ count: "exact" })
      .eq("id", ctx.userB.shopId);

    expect(count === 0 || count === null || error !== null).toBe(true);

    const { data: shopB } = await ctx.admin
      .from("shops")
      .select("id")
      .eq("id", ctx.userB.shopId)
      .single();
    expect(shopB?.id).toBe(ctx.userB.shopId);
  });

  it("interdit au public (anonyme) de supprimer une boutique", async () => {
    if (!isConfigured) return;

    const { error, count } = await ctx.anon
      .from("shops")
      .delete({ count: "exact" })
      .eq("id", ctx.userA.shopId);

    expect(count === 0 || count === null || error !== null).toBe(true);
  });

  it("permet au commerçant de supprimer sa propre boutique et supprime les produits en cascade", async () => {
    if (!isConfigured) return;

    // Ajouter un produit à la boutique A
    const { data: product } = await ctx.userA.client
      .from("products")
      .insert({
        shop_id: ctx.userA.shopId,
        name: "Produit avant suppression boutique",
        price: 2500,
      })
      .select("id")
      .single();

    expect(product?.id).toBeDefined();

    // Commerçant A supprime sa boutique
    const { error: deleteError } = await ctx.userA.client
      .from("shops")
      .delete()
      .eq("id", ctx.userA.shopId);

    expect(deleteError).toBeNull();

    // Vérifier que la boutique n'existe plus
    const { data: shopA } = await ctx.admin
      .from("shops")
      .select("id")
      .eq("id", ctx.userA.shopId)
      .maybeSingle();
    expect(shopA).toBeNull();

    // Vérifier que le produit a bien été supprimé en cascade
    const { data: cascadedProduct } = await ctx.admin
      .from("products")
      .select("id")
      .eq("id", product!.id)
      .maybeSingle();
    expect(cascadedProduct).toBeNull();

    // L'utilisateur A peut désormais recréer une nouvelle boutique (contrainte unique owner_id libérée)
    const newSlug = `nouvelle-boutique-${Date.now().toString(36)}`;
    const { data: newShop, error: createError } = await ctx.userA.client
      .from("shops")
      .insert({
        owner_id: ctx.userA.id,
        name: "Nouvelle Boutique A",
        slug: newSlug,
        whatsapp_number: "+2250700000001",
      })
      .select("id")
      .single();

    expect(createError).toBeNull();
    expect(newShop?.id).toBeDefined();

    // Mettre à jour ctx.userA.shopId pour le cleanup après tests
    ctx.userA.shopId = newShop!.id;
  });
});
