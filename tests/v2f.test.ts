import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isConfigured,
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  type TestContext,
} from "./rls/helpers";
import { sanitizeText, sanitizeContext } from "../src/lib/monitoring/error-tracker";

describe("V2-F — Sécurité, Compte Commerçant, Limites Forfait & Admin", () => {
  let ctx: TestContext;
  let adminUserId: string;

  beforeAll(async () => {
    if (!isConfigured) return;
    const admin = getAdminClient();
    const anon = getAnonClient();
    const userA = await createTestUserWithShop(admin, "v2fa");
    const userB = await createTestUserWithShop(admin, "v2fb");
    ctx = { admin, userA, userB, anon };

    adminUserId = userA.id;
    await admin.from("admins").insert({ user_id: adminUserId });
  });

  afterAll(async () => {
    if (!isConfigured || !ctx) return;
    await ctx.admin.from("admins").delete().eq("user_id", adminUserId);
    await cleanupTestUser(ctx.admin, ctx.userA.id);
    await cleanupTestUser(ctx.admin, ctx.userB.id);
  });

  // 1. Suppression de compte avec cascade propre
  describe("1. Suppression de compte (cascade propre)", () => {
    it("supprime le compte utilisateur et ses données en cascade via delete_user_account", async () => {
      if (!isConfigured) return;

      // Créer un utilisateur temporaire dédié à la suppression
      const tempUser = await createTestUserWithShop(ctx.admin, "v2fdel");

      // Ajouter une catégorie et un produit à sa boutique
      const { data: cat } = await tempUser.client
        .from("categories")
        .insert({ shop_id: tempUser.shopId, name: "Catégorie Test" })
        .select()
        .single();

      if (cat) {
        await tempUser.client.from("products").insert({
          shop_id: tempUser.shopId,
          category_id: cat.id,
          name: "Produit Test Suppression",
          price: 5000,
        });
      }

      // Vérifier que la boutique existe
      const { data: initialShop } = await ctx.admin
        .from("shops")
        .select("id")
        .eq("id", tempUser.shopId)
        .single();
      expect(initialShop?.id).toBe(tempUser.shopId);

      // Exécuter la suppression de compte par l'utilisateur lui-même via la fonction RPC
      const { error: rpcError } = await tempUser.client.rpc("delete_user_account");
      expect(rpcError).toBeNull();

      // Vérifier que la boutique a été supprimée en cascade
      const { data: deletedShop } = await ctx.admin
        .from("shops")
        .select("id")
        .eq("id", tempUser.shopId)
        .maybeSingle();
      expect(deletedShop).toBeNull();

      // Vérifier que les catégories ont été supprimées
      const { data: deletedCategories } = await ctx.admin
        .from("categories")
        .select("id")
        .eq("shop_id", tempUser.shopId);
      expect(deletedCategories?.length ?? 0).toBe(0);

      // Vérifier que l'utilisateur n'existe plus dans auth.users
      const { data: authUser } = await ctx.admin.auth.admin.getUserById(tempUser.id);
      expect(authUser.user).toBeNull();
    });
  });

  // 2. Limite de forfait sur les notifications e-mail
  describe("2. Limite de forfait sur les e-mails de commande", () => {
    it("interdit la fonctionnalité sur le plan gratuit et l'active sur Business et Premium", async () => {
      if (!isConfigured) return;

      // Vérification dans la base de données (subscription_plans)
      const { data: plans, error: planError } = await ctx.admin
        .from("subscription_plans")
        .select("id, has_order_email_notifications");

      expect(planError).toBeNull();
      expect(plans).not.toBeNull();

      const freePlan = plans?.find((p) => p.id === "gratuit");
      const businessPlan = plans?.find((p) => p.id === "business");
      const premiumPlan = plans?.find((p) => p.id === "premium");

      expect(freePlan?.has_order_email_notifications).toBe(false);
      expect(businessPlan?.has_order_email_notifications).toBe(true);
      expect(premiumPlan?.has_order_email_notifications).toBe(true);
    });

    it("empêche un commerçant de modifier la configuration des forfaits pour s'octroyer le droit", async () => {
      if (!isConfigured) return;

      // Le commerçant userB tente d'activer has_order_email_notifications sur le forfait gratuit
      await ctx.userB.client
        .from("subscription_plans")
        .update({ has_order_email_notifications: true })
        .eq("id", "gratuit");

      // Vérifier via l'admin que la modification a été ignorée par les règles RLS
      const { data: checkPlan } = await ctx.admin
        .from("subscription_plans")
        .select("has_order_email_notifications")
        .eq("id", "gratuit")
        .single();

      expect(checkPlan?.has_order_email_notifications).toBe(false);
    });
  });

  // 3. Accès aux pages et fonctions d'administration
  describe("3. Contrôle d'accès aux pages et fonctions Admin", () => {
    it("interdit l'accès d'administration aux utilisateurs non-admin et anonymes", async () => {
      if (!isConfigured) return;

      // Tentative anonyme
      const { error: anonError } = await ctx.anon.rpc("admin_list_shops");
      expect(anonError).not.toBeNull();

      // Tentative d'un commerçant normal (userB)
      const { error: userError } = await ctx.userB.client.rpc("admin_list_shops");
      expect(userError).not.toBeNull();

      // Tentative d'accès à la liste des admins
      const { error: adminListError } = await ctx.userB.client.rpc("admin_list_admins");
      expect(adminListError).not.toBeNull();
    });

    it("autorise uniquement l'administrateur authentifié", async () => {
      if (!isConfigured) return;

      const { data, error } = await ctx.userA.client.rpc("admin_list_shops");
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data!.length).toBeGreaterThan(0);
    });
  });

  // 4. Surveillance des erreurs : garantie d'expurgation des données personnelles (PII)
  describe("4. Surveillance des erreurs sans PII (RGPD / Confidentialité)", () => {
    it("expurge automatiquement les numéros de téléphone et emails des messages d'erreur", () => {
      const rawError = "Échec pour le client John Doe avec email client@test.ci et tel +2250708091011";
      const sanitized = sanitizeText(rawError);

      expect(sanitized).not.toContain("client@test.ci");
      expect(sanitized).not.toContain("+2250708091011");
      expect(sanitized).toContain("[EMAIL_EXPURGÉ]");
      expect(sanitized).toContain("[TEL_EXPURGÉ]");
    });

    it("expurge les champs sensibles et tokens des contextes additionnels", () => {
      const sensitiveContext = {
        customer_email: "test@domain.com",
        customer_phone: "+22501020304",
        customer_name: "Amadou Diallo",
        customer_address: "Cocody Angré 8ème tranche",
        payment_token: "sk_live_1234567890abcdef",
        action: "order_confirmation",
      };

      const cleaned = sanitizeContext(sensitiveContext);

      expect(cleaned.customer_email).toBe("[EXPURGÉ]");
      expect(cleaned.customer_phone).toBe("[EXPURGÉ]");
      expect(cleaned.customer_name).toBe("[EXPURGÉ]");
      expect(cleaned.customer_address).toBe("[EXPURGÉ]");
      expect(cleaned.payment_token).toBe("[EXPURGÉ]");
      expect(cleaned.action).toBe("order_confirmation");
    });
  });
});
