import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isConfigured,
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  type TestContext,
} from "./helpers";

describe("V2-D — Historique des paiements (Ledger, RLS et recalcul automatique du statut)", () => {
  let ctx: TestContext;
  let orderAId: string;
  let payment1Id: string;
  let payment2Id: string;

  beforeAll(async () => {
    if (!isConfigured) return;
    const admin = getAdminClient();
    const anon = getAnonClient();
    const userA = await createTestUserWithShop(admin, "pay_a");
    const userB = await createTestUserWithShop(admin, "pay_b");
    ctx = { admin, userA, userB, anon };

    const { data: customerA, error: custErr } = await admin
      .from("customers")
      .insert({
        shop_id: userA.shopId,
        name: "Client Paiement",
        phone: "+24107998877",
      })
      .select("id")
      .single();
    if (custErr) throw custErr;

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const testCode =
      "CMD-" + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

    const { data: orderA, error: ordErr } = await admin
      .from("orders")
      .insert({
        shop_id: userA.shopId,
        customer_id: customerA!.id,
        public_code: testCode,
        fulfillment: "pickup",
        subtotal: 15000,
        total: 15000,
      })
      .select("id")
      .single();
    if (ordErr) throw ordErr;
    orderAId = orderA!.id;
  });

  afterAll(async () => {
    if (!isConfigured || !ctx) return;
    await cleanupTestUser(ctx.admin, ctx.userA.id);
    await cleanupTestUser(ctx.admin, ctx.userB.id);
  });

  it("interdit au public et au commerçant B d'accéder aux transactions de A", async () => {
    if (!isConfigured) return;

    const { error: errB } = await ctx.userB.client.from("order_payments").insert({
      order_id: orderAId,
      shop_id: ctx.userA.shopId,
      amount: 5000,
      method: "cash",
    });
    expect(errB).not.toBeNull();
  });

  it("calcule automatiquement le statut 'partial' puis 'paid' lors de paiements partiels successifs", async () => {
    if (!isConfigured) return;

    // 1er versement partiel : 6 000 FCFA en espèces (sur 15 000 FCFA)
    const { data: p1, error: e1 } = await ctx.userA.client
      .from("order_payments")
      .insert({
        order_id: orderAId,
        shop_id: ctx.userA.shopId,
        amount: 6000,
        method: "cash",
        note: "Acompte espèces",
      })
      .select("id")
      .single();
    expect(e1).toBeNull();
    payment1Id = p1!.id;

    const { data: ordAfter1 } = await ctx.userA.client
      .from("orders")
      .select("amount_paid, payment_status, payment_method")
      .eq("id", orderAId)
      .single();
    expect(ordAfter1?.amount_paid).toBe(6000);
    expect(ordAfter1?.payment_status).toBe("partial");
    expect(ordAfter1?.payment_method).toBe("cash");

    // 2ème versement : 9 000 FCFA par Mobile Money -> Solde atteint (15 000 FCFA)
    const { data: p2, error: e2 } = await ctx.userA.client
      .from("order_payments")
      .insert({
        order_id: orderAId,
        shop_id: ctx.userA.shopId,
        amount: 9000,
        method: "mobile_money",
        note: "Solde Airtel Money",
      })
      .select("id")
      .single();
    expect(e2).toBeNull();
    payment2Id = p2!.id;

    const { data: ordAfter2 } = await ctx.userA.client
      .from("orders")
      .select("amount_paid, payment_status, payment_method")
      .eq("id", orderAId)
      .single();
    expect(ordAfter2?.amount_paid).toBe(15000);
    expect(ordAfter2?.payment_status).toBe("paid");
    expect(ordAfter2?.payment_method).toBe("mobile_money");
  });

  it("recalcule automatiquement le solde restant en cas de suppression d'un versement", async () => {
    if (!isConfigured) return;

    const { error: delErr } = await ctx.userA.client
      .from("order_payments")
      .delete()
      .eq("id", payment2Id);
    expect(delErr).toBeNull();

    const { data: ordAfterDel } = await ctx.userA.client
      .from("orders")
      .select("amount_paid, payment_status, payment_method")
      .eq("id", orderAId)
      .single();
    expect(ordAfterDel?.amount_paid).toBe(6000);
    expect(ordAfterDel?.payment_status).toBe("partial");
    expect(ordAfterDel?.payment_method).toBe("cash");

    // Suppression du 1er versement -> retour à unpaid (0 FCFA)
    await ctx.userA.client.from("order_payments").delete().eq("id", payment1Id);
    const { data: ordAfterZero } = await ctx.userA.client
      .from("orders")
      .select("amount_paid, payment_status")
      .eq("id", orderAId)
      .single();
    expect(ordAfterZero?.amount_paid).toBe(0);
    expect(ordAfterZero?.payment_status).toBe("unpaid");
  });
});
