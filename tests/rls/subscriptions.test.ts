import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isConfigured,
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  type TestContext,
} from "./helpers";

describe("V2-E — Abonnements et limites configurables (RLS, déclencheurs et requêtes Mobile Money)", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    if (!isConfigured) return;
    const admin = getAdminClient();
    const anon = getAnonClient();
    const userA = await createTestUserWithShop(admin, "sub_a");
    const userB = await createTestUserWithShop(admin, "sub_b");
    ctx = { admin, userA, userB, anon };
  });

  afterAll(async () => {
    if (!isConfigured || !ctx) return;
    await cleanupTestUser(ctx.admin, ctx.userA.id);
    await cleanupTestUser(ctx.admin, ctx.userB.id);
  });

  it("permet à tout le monde (anonyme inclus) de consulter les forfaits disponibles", async () => {
    if (!isConfigured) return;

    const { data: plans, error } = await ctx.anon
      .from("subscription_plans")
      .select("id, name, price_monthly, max_products, max_orders_per_month")
      .order("price_monthly", { ascending: true });

    expect(error).toBeNull();
    expect(plans).not.toBeNull();
    expect(plans!.length).toBeGreaterThanOrEqual(3);

    const ids = plans!.map((p) => p.id);
    expect(ids).toContain("gratuit");
    expect(ids).toContain("business");
    expect(ids).toContain("premium");
  });

  it("interdit aux utilisateurs anonymes ou commerçants de modifier les tarifs", async () => {
    if (!isConfigured) return;

    // Tentative de modification par anonyme
    await ctx.anon
      .from("subscription_plans")
      .update({ price_monthly: 0 })
      .eq("id", "premium");

    // Tentative de modification par un commerçant
    await ctx.userA.client
      .from("subscription_plans")
      .update({ price_monthly: 0 })
      .eq("id", "premium");

    // Le prix du forfait premium doit être strictement préservé à 12 000 FCFA
    const { data: check } = await ctx.admin
      .from("subscription_plans")
      .select("price_monthly")
      .eq("id", "premium")
      .single();

    expect(check!.price_monthly).toBe(12000);
  });

  it("crée automatiquement un abonnement gratuit pour toute nouvelle boutique", async () => {
    if (!isConfigured) return;

    const { data: sub, error } = await ctx.userA.client
      .from("shop_subscriptions")
      .select("*, plan:subscription_plans(id, name)")
      .eq("shop_id", ctx.userA.shopId)
      .single();

    expect(error).toBeNull();
    expect(sub).not.toBeNull();
    expect(sub!.plan_id).toBe("gratuit");
    expect(sub!.status).toBe("active");
  });

  it("isole les abonnements : le commerçant B ne peut pas voir ni modifier l'abonnement de A", async () => {
    if (!isConfigured) return;

    // B tente de lire l'abonnement de A
    const { data: subASeenByB } = await ctx.userB.client
      .from("shop_subscriptions")
      .select("*")
      .eq("shop_id", ctx.userA.shopId);

    expect(subASeenByB).toHaveLength(0);

    // B tente de modifier l'abonnement de A
    await ctx.userB.client
      .from("shop_subscriptions")
      .update({ plan_id: "premium" })
      .eq("shop_id", ctx.userA.shopId);

    // Vérification que le plan de A est toujours inchangé
    const { data: subACheck } = await ctx.admin
      .from("shop_subscriptions")
      .select("plan_id")
      .eq("shop_id", ctx.userA.shopId)
      .single();

    expect(subACheck!.plan_id).toBe("gratuit");
  });

  it("permet au commerçant de soumettre une demande d'upgrade Mobile Money pour sa boutique", async () => {
    if (!isConfigured) return;

    const { data: req, error } = await ctx.userA.client
      .from("subscription_requests")
      .insert({
        shop_id: ctx.userA.shopId,
        requested_plan_id: "business",
        duration_months: 1,
        amount_due: 5000,
        payment_method: "wave",
        sender_phone: "+2250700000001",
        transaction_reference: "TX-TEST-WAVE-123",
        status: "pending",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(req).not.toBeNull();
    expect(req!.requested_plan_id).toBe("business");
    expect(req!.status).toBe("pending");

    // Le commerçant B ne peut pas voir cette demande
    const { data: seenByB } = await ctx.userB.client
      .from("subscription_requests")
      .select("*")
      .eq("id", req!.id);

    expect(seenByB).toHaveLength(0);

    // B ne peut pas soumettre de demande pour la boutique de A
    const { error: hackError } = await ctx.userB.client
      .from("subscription_requests")
      .insert({
        shop_id: ctx.userA.shopId,
        requested_plan_id: "premium",
        duration_months: 1,
        amount_due: 12000,
        payment_method: "orange_money",
        sender_phone: "+2250700000002",
        status: "pending",
      });

    expect(hackError).not.toBeNull();
  });

  it("résout correctement les fonctions SQL de limites et de plan actif", async () => {
    if (!isConfigured) return;

    type ActivePlan = { id: string; name: string };
    const { data: activePlan } = await ctx.admin.rpc("get_active_shop_plan", {
      p_shop_id: ctx.userA.shopId,
    });
    expect((activePlan as unknown as ActivePlan)?.id).toBe("gratuit");

    const { data: prodLimit } = await ctx.admin.rpc("shop_product_limit", {
      p_shop_id: ctx.userA.shopId,
    });
    expect(prodLimit).toBe(5);

    const { data: orderLimit } = await ctx.admin.rpc("shop_monthly_orders_limit", {
      p_shop_id: ctx.userA.shopId,
    });
    expect(orderLimit).toBe(10);

    // Vérification des quotas du forfait Business (50 produits, 100 commandes/mois)
    const { data: businessPlan } = await ctx.admin
      .from("subscription_plans")
      .select("max_products, max_orders_per_month")
      .eq("id", "business")
      .single();
    expect(businessPlan?.max_products).toBe(50);
    expect(businessPlan?.max_orders_per_month).toBe(100);
  });
});
