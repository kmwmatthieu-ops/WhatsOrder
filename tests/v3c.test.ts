import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  isConfigured,
} from "./rls/helpers";
import { isShopCertifiedBadgeEligible, type ResolvedSubscription } from "@/lib/subscription";

describe("V3-C — Paramètres de Forfaits, Classement Explorer, Badge de Certification & Communauté WhatsApp", () => {
  // 1. Tests unitaires de la règle d'attribution du badge certifié (forfait + identité + expiration)
  describe("Règle V3-C d'éligibilité au badge certifié (isShopCertifiedBadgeEligible)", () => {
    const gratuitPlan = {
      id: "gratuit",
      name: "Gratuit",
      description: "Idéal pour démarrer",
      price_monthly: 0,
      max_products: 5,
      max_orders_per_month: 10,
      has_advanced_stats: false,
      has_csv_export: false,
      has_order_email_notifications: false,
      visibility_multiplier: 1.0,
      has_certified_badge: false,
      badge: "Découverte",
      is_active: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const businessPlan = {
      ...gratuitPlan,
      id: "business",
      name: "Business",
      price_monthly: 10000,
      visibility_multiplier: 1.5,
      has_certified_badge: false,
    };

    const premiumPlan = {
      ...gratuitPlan,
      id: "premium",
      name: "Premium",
      price_monthly: 25000,
      visibility_multiplier: 2.5,
      has_certified_badge: true,
    };

    it("accorde le badge SI identité vérifiée ET forfait Premium actif", () => {
      const resolved: ResolvedSubscription = {
        subscription: {
          id: "sub-1",
          shop_id: "shop-1",
          plan_id: "premium",
          status: "active",
          starts_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        effectivePlan: premiumPlan,
        actualPlan: premiumPlan,
        isExpired: false,
        daysRemaining: 30,
      };

      // Les deux conditions réunies
      expect(isShopCertifiedBadgeEligible(true, resolved)).toBe(true);
    });

    it("refuse le badge si l'identité N'EST PAS vérifiée même avec forfait Premium", () => {
      const resolved: ResolvedSubscription = {
        subscription: null,
        effectivePlan: premiumPlan,
        actualPlan: premiumPlan,
        isExpired: false,
        daysRemaining: 30,
      };

      expect(isShopCertifiedBadgeEligible(false, resolved)).toBe(false);
    });

    it("refuse le badge si l'identité est vérifiée mais le forfait est Gratuit ou Business (sans badge)", () => {
      const resolvedGratuit: ResolvedSubscription = {
        subscription: null,
        effectivePlan: gratuitPlan,
        actualPlan: gratuitPlan,
        isExpired: false,
        daysRemaining: null,
      };

      const resolvedBusiness: ResolvedSubscription = {
        subscription: null,
        effectivePlan: businessPlan,
        actualPlan: businessPlan,
        isExpired: false,
        daysRemaining: 30,
      };

      expect(isShopCertifiedBadgeEligible(true, resolvedGratuit)).toBe(false);
      expect(isShopCertifiedBadgeEligible(true, resolvedBusiness)).toBe(false);
    });

    it("révoque immédiatement le badge dès l'expiration de l'abonnement Premium", () => {
      const resolvedExpired: ResolvedSubscription = {
        subscription: {
          id: "sub-expired",
          shop_id: "shop-1",
          plan_id: "premium",
          status: "active",
          starts_at: new Date(Date.now() - 86400000 * 40).toISOString(),
          expires_at: new Date(Date.now() - 86400000 * 1).toISOString(),
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        effectivePlan: gratuitPlan, // Retombe automatiquement sur Gratuit
        actualPlan: premiumPlan,
        isExpired: true,
        daysRemaining: 0,
      };

      expect(isShopCertifiedBadgeEligible(true, resolvedExpired)).toBe(false);
    });
  });

  // 2. Tests d'intégration base de données & RPCs
  if (!isConfigured) {
    it.skip("Supabase non configuré pour les tests distants", () => {});
    return;
  }

  const admin = getAdminClient();
  const anon = getAnonClient();

  let userA: Awaited<ReturnType<typeof createTestUserWithShop>>;
  let userB: Awaited<ReturnType<typeof createTestUserWithShop>>;

  beforeAll(async () => {
    userA = await createTestUserWithShop(admin, "v3c_a");
    userB = await createTestUserWithShop(admin, "v3c_b");
  });

  afterAll(async () => {
    if (userA) await cleanupTestUser(admin, userA.id);
    if (userB) await cleanupTestUser(admin, userB.id);
  });

  it("1. les forfaits possèdent visibility_multiplier et has_certified_badge avec les valeurs exigées", async () => {
    const { data: plans, error } = await anon
      .from("subscription_plans")
      .select("id, visibility_multiplier, has_certified_badge")
      .in("id", ["gratuit", "business", "premium"]);

    expect(error).toBeNull();
    const gratuit = plans?.find((p) => p.id === "gratuit");
    const business = plans?.find((p) => p.id === "business");
    const premium = plans?.find((p) => p.id === "premium");

    expect(Number(gratuit?.visibility_multiplier)).toBe(1.0);
    expect(gratuit?.has_certified_badge).toBe(false);

    expect(Number(business?.visibility_multiplier)).toBe(1.5);
    expect(business?.has_certified_badge).toBe(false);

    expect(Number(premium?.visibility_multiplier)).toBe(2.5);
    expect(premium?.has_certified_badge).toBe(true);
  });

  it("2. permet à l'admin de modifier un forfait via admin_update_subscription_plan", async () => {
    // Modifier temporairement le multiplicateur de business à 1.8
    const { error: updateErr } = await admin.rpc("admin_update_subscription_plan", {
      p_plan_id: "business",
      p_visibility_multiplier: 1.8,
      p_has_certified_badge: false,
    });
    expect(updateErr).toBeNull();

    const { data: planAfter } = await anon
      .from("subscription_plans")
      .select("visibility_multiplier")
      .eq("id", "business")
      .single();
    expect(Number(planAfter?.visibility_multiplier)).toBe(1.8);

    // Restaurer à 1.5
    await admin.rpc("admin_update_subscription_plan", {
      p_plan_id: "business",
      p_visibility_multiplier: 1.5,
      p_has_certified_badge: false,
    });
  });

  it("3. gère le réglage de la plateforme pour la communauté WhatsApp", async () => {
    // Lecture anonyme du réglage
    const { data: setting } = await anon
      .from("platform_settings")
      .select("value")
      .eq("key", "community_whatsapp_url")
      .single();
    expect(setting).toBeDefined();

    // Modification par l'admin via RPC
    const testUrl = "https://chat.whatsapp.com/TEST_COMMUNITY_V3C";
    const { error: setErr } = await admin.rpc("admin_set_platform_setting", {
      p_key: "community_whatsapp_url",
      p_value: testUrl,
    });
    expect(setErr).toBeNull();

    const { data: settingUpdated } = await anon
      .from("platform_settings")
      .select("value")
      .eq("key", "community_whatsapp_url")
      .single();
    expect(settingUpdated?.value).toBe(testUrl);

    // Vider à nouveau pour laisser le champ propre
    await admin.rpc("admin_set_platform_setting", {
      p_key: "community_whatsapp_url",
      p_value: "",
    });
  });

  it("4. permet à l'admin de cocher/décocher identité vérifiée via admin_toggle_identity_verified", async () => {
    // Cocher identité vérifiée pour userA
    const { error: toggleErr } = await admin.rpc("admin_toggle_identity_verified", {
      p_shop_id: userA.shopId,
      p_identity_verified: true,
    });
    expect(toggleErr).toBeNull();

    const { data: shopA } = await admin
      .from("shops")
      .select("identity_verified")
      .eq("id", userA.shopId)
      .single();
    expect(shopA?.identity_verified).toBe(true);

    // Décocher
    await admin.rpc("admin_toggle_identity_verified", {
      p_shop_id: userA.shopId,
      p_identity_verified: false,
    });
  });

  it("5. RPC get_explorer_products applique les garde-fous de pertinence et diversité", async () => {
    // Donner à userA un abonnement Premium actif pour tester le multiplicateur de visibilité
    const { error: subErr } = await admin.from("shop_subscriptions").upsert(
      {
        shop_id: userA.shopId,
        plan_id: "premium",
        status: "active",
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
      },
      { onConflict: "shop_id" }
    );
    expect(subErr).toBeNull();

    // 1. Ajouter 3 produits pour la boutique A avec photos
    await admin.from("products").insert([
      {
        shop_id: userA.shopId,
        name: "Produit A1 Smartphone V3C",
        description: "Description A1",
        price: 150000,
        images: ["https://example.com/a1.jpg"],
        is_available: true,
        is_hidden: false,
      },
      {
        shop_id: userA.shopId,
        name: "Produit A2 Smartphone V3C",
        description: "Description A2",
        price: 180000,
        images: ["https://example.com/a2.jpg"],
        is_available: true,
        is_hidden: false,
      },
      {
        shop_id: userA.shopId,
        name: "Produit A3 Smartphone V3C",
        description: "Description A3",
        price: 200000,
        images: ["https://example.com/a3.jpg"],
        is_available: true,
        is_hidden: false,
      },
    ]);

    // 2. Ajouter 1 produit pour la boutique B
    await admin.from("products").insert([
      {
        shop_id: userB.shopId,
        name: "Produit B1 Smartphone V3C",
        description: "Description B1",
        price: 120000,
        images: ["https://example.com/b1.jpg"],
        is_available: true,
        is_hidden: false,
      },
    ]);

    // Exécuter get_explorer_products avec recherche
    const { data: explorerResults, error } = await anon.rpc("get_explorer_products", {
      p_search: "Smartphone V3C",
      p_limit: 10,
      p_offset: 0,
    });

    expect(error).toBeNull();
    expect(explorerResults).toBeDefined();
    expect(explorerResults!.length).toBeGreaterThanOrEqual(4);

    // Vérifier le garde-fou diversité : pas plus de 2 produits consécutifs de la même boutique
    const results = explorerResults as Array<{ product_id: string; shop_id: string; product_name: string }>;
    for (let i = 0; i < results.length - 2; i++) {
      const sameShopThreeInARow =
        results[i].shop_id === results[i + 1].shop_id &&
        results[i + 1].shop_id === results[i + 2].shop_id;
      expect(sameShopThreeInARow).toBe(false);
    }
  });
});
