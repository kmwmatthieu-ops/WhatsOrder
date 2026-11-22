import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isConfigured,
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  type TestContext,
} from "./rls/helpers";

describe("V3-A — Explorer, Visibilité des Boutiques, Profils Clients & Modération", () => {
  let ctx: TestContext;
  let adminUserId: string;

  beforeAll(async () => {
    if (!isConfigured) return;
    const admin = getAdminClient();
    const anon = getAnonClient();
    const userA = await createTestUserWithShop(admin, "v3a_a");
    const userB = await createTestUserWithShop(admin, "v3a_b");
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

  // 1. Isolation des données des comptes clients
  describe("1. Isolation stricte des profils clients (customer_profiles)", () => {
    it("interdit à l'utilisateur B de lire ou modifier le profil client de l'utilisateur A", async () => {
      if (!isConfigured) return;

      // Création du profil pour A
      await ctx.userA.client.from("customer_profiles").upsert({
        id: ctx.userA.id,
        full_name: "Client Alpha",
        activity_consent: true,
        personalization_enabled: true,
      });

      // Tentative de lecture par B
      const { data: readData, error: readError } = await ctx.userB.client
        .from("customer_profiles")
        .select("*")
        .eq("id", ctx.userA.id);

      expect(readError).toBeNull();
      expect(readData?.length ?? 0).toBe(0);

      // Tentative d'écriture / modification par B sur le profil de A
      const { error: updateError } = await ctx.userB.client
        .from("customer_profiles")
        .update({ full_name: "Hacked Name" })
        .eq("id", ctx.userA.id);

      expect(updateError).toBeNull(); // RLS PostgreSQL filtre silencieusement 0 rows

      // Vérifier via client admin que le nom n'a pas été modifié
      const { data: checkData } = await ctx.admin
        .from("customer_profiles")
        .select("full_name")
        .eq("id", ctx.userA.id)
        .single();

      expect(checkData?.full_name).toBe("Client Alpha");
    });

    it("interdit au public anonyme de lire les profils clients", async () => {
      if (!isConfigured) return;

      const { data, error } = await ctx.anon
        .from("customer_profiles")
        .select("*");

      expect(error).toBeNull();
      expect(data?.length ?? 0).toBe(0);
    });
  });

  // 2. Visibilité Explorer & modération des produits
  describe("2. Règles d'apparition et modération sur Explorer (get_explorer_products)", () => {
    let testProductId: string;

    beforeAll(async () => {
      if (!isConfigured) return;

      // Créer un produit avec photo dans la boutique A
      const { data: prod } = await ctx.userA.client
        .from("products")
        .insert({
          shop_id: ctx.userA.shopId,
          name: "Robe Wax Unique Explorer",
          price: 15000,
          images: ["https://example.com/robe.jpg"],
          is_available: true,
          is_hidden: false,
        })
        .select()
        .single();

      testProductId = prod!.id;
    });

    afterAll(async () => {
      if (!isConfigured || !testProductId) return;
      await ctx.admin.from("products").delete().eq("id", testProductId);
    });

    it("affiche le produit actif avec photo dans Explorer pour le public", async () => {
      if (!isConfigured) return;

      const { data, error } = await ctx.anon.rpc("get_explorer_products", {
        p_search: "Robe Wax Unique Explorer",
      });

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      const found = data?.find((p) => p.product_id === testProductId);
      expect(found).toBeDefined();
      expect(found?.product_name).toBe("Robe Wax Unique Explorer");
    });

    it("retire immédiatement le produit d'Explorer s'il est masqué par la modération (is_hidden = true)", async () => {
      if (!isConfigured) return;

      // Modération masque le produit
      await ctx.admin
        .from("products")
        .update({ is_hidden: true })
        .eq("id", testProductId);

      const { data, error } = await ctx.anon.rpc("get_explorer_products", {
        p_search: "Robe Wax Unique Explorer",
      });

      expect(error).toBeNull();
      const found = data?.find((p) => p.product_id === testProductId);
      expect(found).toBeUndefined();

      // Rétablissement pour le test suivant
      await ctx.admin
        .from("products")
        .update({ is_hidden: false })
        .eq("id", testProductId);
    });

    it("retire tous les produits d'Explorer si le commerçant désactive is_listed_in_explorer", async () => {
      if (!isConfigured) return;

      // Commerçant A désactive sa présence dans Explorer
      await ctx.userA.client
        .from("shops")
        .update({ is_listed_in_explorer: false })
        .eq("id", ctx.userA.shopId);

      const { data } = await ctx.anon.rpc("get_explorer_products", {
        p_search: "Robe Wax Unique Explorer",
      });

      const found = data?.find((p) => p.product_id === testProductId);
      expect(found).toBeUndefined();

      // Réactivation
      await ctx.userA.client
        .from("shops")
        .update({ is_listed_in_explorer: true })
        .eq("id", ctx.userA.shopId);
    });
  });

  // 3. Signalements et Modération par l'administrateur
  describe("3. Signalements (reports) et Modération Admin", () => {
    let reportId: string;

    it("permet à un utilisateur ou visiteur d'envoyer un signalement", async () => {
      if (!isConfigured) return;

      const { error } = await ctx.anon
        .from("reports")
        .insert({
          target_type: "shop",
          shop_id: ctx.userB.shopId,
          reason: "contrefacon",
          details: "Signalement de test automatique",
        });

      expect(error).toBeNull();

      // Vérifier via l'admin que le signalement a bien été enregistré
      const { data: adminCheck } = await ctx.admin
        .from("reports")
        .select("id")
        .eq("shop_id", ctx.userB.shopId)
        .order("created_at", { ascending: false })
        .limit(1);

      expect(adminCheck).not.toBeNull();
      expect(adminCheck!.length).toBeGreaterThan(0);
      reportId = adminCheck![0].id;
    });

    it("interdit à un commerçant non-admin de lister les signalements", async () => {
      if (!isConfigured) return;

      const { error } = await ctx.userB.client.rpc("admin_list_reports");
      expect(error).not.toBeNull();
    });

    it("permet à l'administrateur de lister les signalements et de les traiter", async () => {
      if (!isConfigured || !reportId) return;

      // 1. Admin liste les signalements
      const { data: reports, error: listError } = await ctx.userA.client.rpc("admin_list_reports");
      expect(listError).toBeNull();
      expect(Array.isArray(reports)).toBe(true);

      const found = reports?.find((r) => r.id === reportId);
      expect(found).toBeDefined();

      // 2. Admin rejette / classe le signalement
      const { data: resolveRes, error: resolveErr } = await ctx.userA.client.rpc(
        "admin_resolve_report",
        {
          p_report_id: reportId,
          p_action: "dismiss",
          p_notes: "Vérifié conforme",
        }
      );

      expect(resolveErr).toBeNull();
      expect(resolveRes).toBeDefined();

      // Vérifier le nouveau statut
      const { data: updatedReport } = await ctx.admin
        .from("reports")
        .select("status")
        .eq("id", reportId)
        .single();

      expect(updatedReport?.status).toBe("dismissed");

      // Nettoyage
      await ctx.admin.from("reports").delete().eq("id", reportId);
    });
  });
});
