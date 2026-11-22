import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isConfigured,
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
} from "./rls/helpers";

describe("V3-D — Personnalisation (« Pour vous »), Consentement, Activité Client & Effacement", () => {
  if (!isConfigured) {
    it.skip("Supabase non configuré pour les tests distants", () => {});
    return;
  }

  const admin = getAdminClient();
  const anon = getAnonClient();

  let userA: Awaited<ReturnType<typeof createTestUserWithShop>>;
  let userB: Awaited<ReturnType<typeof createTestUserWithShop>>;
  let testProductId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    userA = await createTestUserWithShop(admin, "v3da");
    userB = await createTestUserWithShop(admin, "v3db");

    // Créer une catégorie de test
    const { data: cat } = await admin
      .from("categories")
      .insert({ shop_id: userA.shopId, name: "Mode V3D" })
      .select("id")
      .single();
    testCategoryId = cat!.id;

    // Créer un produit de test pour la boutique A
    const { data: prod } = await admin
      .from("products")
      .insert({
        shop_id: userA.shopId,
        category_id: testCategoryId,
        name: "Chaussures V3D",
        price: 25000,
        images: ["https://example.com/shoes.jpg"],
        is_available: true,
        is_hidden: false,
      })
      .select("id")
      .single();
    testProductId = prod!.id;
  });

  afterAll(async () => {
    if (userA) await cleanupTestUser(admin, userA.id);
    if (userB) await cleanupTestUser(admin, userB.id);
  });

  it("1. Refuse d'enregistrer l'activité si le client n'a pas donné son consentement", async () => {
    // S'assurer que le profil de userA a has_consented_personalization = false
    await admin.from("customer_profiles").upsert({
      id: userA.id,
      has_consented_personalization: false,
      activity_consent: false,
      personalization_enabled: false,
    });

    // Tenter d'enregistrer une activité avec le client connecté de userA
    const { data: recorded, error } = await userA.client.rpc("record_customer_activity", {
      p_activity_type: "view",
      p_product_id: testProductId,
      p_shop_id: userA.shopId,
      p_category_id: testCategoryId,
    });

    expect(error).toBeNull();
    // Doit renvoyer false silencieusement pour respecter la vie privée
    expect(recorded).toBe(false);

    // Vérifier qu'aucune ligne n'a été insérée
    const { data: rows } = await admin
      .from("customer_activity")
      .select("*")
      .eq("customer_id", userA.id);
    expect(rows?.length).toBe(0);
  });

  it("2. Enregistre l'activité si le client a consenti et auto-déduit shop_id et category_id", async () => {
    // Activer le consentement de userA via la RPC
    const { data: consentOk, error: consentErr } = await userA.client.rpc("set_my_personalization_consent", {
      p_consented: true,
    });
    expect(consentErr).toBeNull();
    expect(consentOk).toBe(true);

    // Enregistrer une vue sans spécifier category_id ni shop_id
    const { data: recorded, error } = await userA.client.rpc("record_customer_activity", {
      p_activity_type: "click",
      p_product_id: testProductId,
    });

    expect(error).toBeNull();
    expect(recorded).toBe(true);

    // Vérifier l'insertion et l'auto-déduction
    const { data: rows } = await userA.client
      .from("customer_activity")
      .select("*")
      .eq("customer_id", userA.id);

    expect(rows?.length).toBe(1);
    expect(rows![0].activity_type).toBe("click");
    expect(rows![0].product_id).toBe(testProductId);
    expect(rows![0].shop_id).toBe(userA.shopId);
    expect(rows![0].category_id).toBe(testCategoryId);
  });

  it("3. get_my_personalization_stats renvoie le statut et le nombre d'activités", async () => {
    const { data: stats, error } = await userA.client.rpc("get_my_personalization_stats");
    expect(error).toBeNull();
    expect(stats).toBeDefined();
    expect(stats!.length).toBe(1);
    expect(stats![0].has_consented).toBe(true);
    expect(Number(stats![0].activity_count)).toBeGreaterThanOrEqual(1);
  });

  it("4. Isole strictement les activités : l'utilisateur B ne peut pas lire l'activité de A", async () => {
    // userB consulte la table customer_activity
    const { data: rowsB, error: errB } = await userB.client
      .from("customer_activity")
      .select("*")
      .eq("customer_id", userA.id);

    expect(errB).toBeNull();
    // Grâce à RLS, userB ne voit rien (0 lignes)
    expect(rowsB?.length).toBe(0);
  });

  it("5. clear_my_customer_activity efface intégralement l'historique du client", async () => {
    const { data: cleared, error: clearErr } = await userA.client.rpc("clear_my_customer_activity");
    expect(clearErr).toBeNull();
    expect(cleared).toBe(true);

    const { data: rows } = await userA.client
      .from("customer_activity")
      .select("*")
      .eq("customer_id", userA.id);
    expect(rows?.length).toBe(0);
  });

  it("6. La révocation du consentement purge immédiatement l'historique existant", async () => {
    // 1. Réactiver et insérer une activité
    await userA.client.rpc("set_my_personalization_consent", { p_consented: true });
    await userA.client.rpc("record_customer_activity", {
      p_activity_type: "search",
      p_search_query: "sneakers",
    });

    const { data: beforeRows } = await userA.client
      .from("customer_activity")
      .select("*")
      .eq("customer_id", userA.id);
    expect(beforeRows?.length).toBe(1);

    // 2. Révoquer le consentement
    await userA.client.rpc("set_my_personalization_consent", { p_consented: false });

    // 3. Vérifier la purge automatique
    const { data: afterRows } = await userA.client
      .from("customer_activity")
      .select("*")
      .eq("customer_id", userA.id);
    expect(afterRows?.length).toBe(0);
  });

  it("7. get_for_you_products applique la recommandation personnalisée et les garde-fous", async () => {
    // Créer des produits pour les deux boutiques
    const { data: prodA2 } = await admin.from("products").insert({
      shop_id: userA.shopId,
      category_id: testCategoryId,
      name: "T-shirt V3D Recommandé",
      price: 12000,
      images: ["https://example.com/tshirt.jpg"],
      is_available: true,
      is_hidden: false,
    }).select("id").single();

    // Réactiver le consentement et simuler un intérêt marqué pour testCategoryId
    await userA.client.rpc("set_my_personalization_consent", { p_consented: true });
    await userA.client.rpc("record_customer_activity", {
      p_activity_type: "view",
      p_product_id: testProductId,
      p_category_id: testCategoryId,
    });
    await userA.client.rpc("record_customer_activity", {
      p_activity_type: "click",
      p_product_id: prodA2!.id,
      p_category_id: testCategoryId,
    });

    // Exécuter get_for_you_products avec userA connecté
    const { data: recommendations, error } = await userA.client.rpc("get_for_you_products", {
      p_limit: 10,
      p_offset: 0,
    });

    expect(error).toBeNull();
    expect(recommendations).toBeDefined();
    expect(recommendations!.length).toBeGreaterThan(0);

    // Vérifier la présence des produits de la catégorie d'affinité
    const matchedCategory = recommendations!.find((r) => r.category_id === testCategoryId);
    expect(matchedCategory).toBeDefined();

    // Vérifier la diversité : pas plus de 2 produits consécutifs de la même boutique
    const results = recommendations as Array<{ product_id: string; shop_id: string }>;
    for (let i = 0; i < results.length - 2; i++) {
      const sameShopThreeInARow =
        results[i].shop_id === results[i + 1].shop_id &&
        results[i + 1].shop_id === results[i + 2].shop_id;
      expect(sameShopThreeInARow).toBe(false);
    }
  });
});
