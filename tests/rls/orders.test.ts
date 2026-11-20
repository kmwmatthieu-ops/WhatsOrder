import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isConfigured,
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  type TestContext,
} from "./helpers";

describe("RLS — Commandes et Données Clients (confidentialité absolue)", () => {
  let ctx: TestContext;
  let orderAId: string;

  beforeAll(async () => {
    if (!isConfigured) return;
    const admin = getAdminClient();
    const anon = getAnonClient();
    const userA = await createTestUserWithShop(admin, "ord_a");
    const userB = await createTestUserWithShop(admin, "ord_b");
    ctx = { admin, userA, userB, anon };

    // Créer un client et une commande dans la boutique A via admin (simule place_order)
    const { data: customerA } = await admin
      .from("customers")
      .insert({
        shop_id: userA.shopId,
        name: "Client Test A",
        phone: "+2250701020304",
      })
      .select("id")
      .single();

    const { data: orderA } = await admin
      .from("orders")
      .insert({
        shop_id: userA.shopId,
        customer_id: customerA!.id,
        public_code: "CMD-TEST1",
        fulfillment: "pickup",
        subtotal: 5000,
        total: 5000,
      })
      .select("id")
      .single();

    orderAId = orderA!.id;
  });

  afterAll(async () => {
    if (!isConfigured || !ctx) return;
    await cleanupTestUser(ctx.admin, ctx.userA.id);
    await cleanupTestUser(ctx.admin, ctx.userB.id);
  });

  it("interdit au public (anonyme) de lire les commandes", async () => {
    if (!isConfigured) return;

    const { data } = await ctx.anon.from("orders").select("*");
    expect(data?.length ?? 0).toBe(0);
  });

  it("interdit au public (anonyme) de lire les clients", async () => {
    if (!isConfigured) return;

    const { data } = await ctx.anon.from("customers").select("*");
    expect(data?.length ?? 0).toBe(0);
  });

  it("empêche le commerçant B de lire les commandes de la boutique A", async () => {
    if (!isConfigured) return;

    const { data } = await ctx.userB.client
      .from("orders")
      .select("*")
      .eq("id", orderAId);

    expect(data?.length ?? 0).toBe(0);
  });

  it("permet au commerçant A de lire sa propre commande", async () => {
    if (!isConfigured) return;

    const { data, error } = await ctx.userA.client
      .from("orders")
      .select("id, public_code, total")
      .eq("id", orderAId)
      .single();

    expect(error).toBeNull();
    expect(data?.public_code).toBe("CMD-TEST1");
  });

  it("empêche le commerçant A de modifier le montant total de sa commande", async () => {
    if (!isConfigured) return;

    const { error } = await ctx.userA.client
      .from("orders")
      .update({ total: 999999 })
      .eq("id", orderAId);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("FORBIDDEN_ORDER_FIELDS");
  });

  it("alimente automatiquement l'historique lors d'un changement de statut", async () => {
    if (!isConfigured) return;

    // A passe la commande à confirmed
    const { error } = await ctx.userA.client
      .from("orders")
      .update({ status: "confirmed" })
      .eq("id", orderAId);

    expect(error).toBeNull();

    // Vérifier l'historique
    const { data: history } = await ctx.userA.client
      .from("order_status_history")
      .select("status")
      .eq("order_id", orderAId);

    expect(history?.some((h) => h.status === "confirmed")).toBe(true);
  });
});
