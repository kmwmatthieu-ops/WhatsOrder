import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  isConfigured,
} from "./rls/helpers";

describe("V3-B — Abonnements Client-Boutique, Compteur d'Abonnés & Fil Suivi", () => {
  if (!isConfigured) {
    it.skip("Supabase non configuré pour les tests", () => {});
    return;
  }

  const admin = getAdminClient();
  const anon = getAnonClient();

  let userA: Awaited<ReturnType<typeof createTestUserWithShop>>;
  let userB: Awaited<ReturnType<typeof createTestUserWithShop>>;

  beforeAll(async () => {
    userA = await createTestUserWithShop(admin, "v3b_a");
    userB = await createTestUserWithShop(admin, "v3b_b");
  });

  afterAll(async () => {
    if (userA) await cleanupTestUser(admin, userA.id);
    if (userB) await cleanupTestUser(admin, userB.id);
  });

  it("1. permet à un client A de suivre la boutique de B et incrémente followers_count", async () => {
    // Client A suit la boutique de B
    const { data, error } = await userA.client.rpc("toggle_follow_shop", {
      p_shop_id: userB.shopId,
    });

    expect(error).toBeNull();
    const result = data as { following: boolean; followers_count: number };
    expect(result.following).toBe(true);
    expect(result.followers_count).toBeGreaterThanOrEqual(1);

    // Vérifier is_following_shop
    const { data: isFollowing } = await userA.client.rpc("is_following_shop", {
      p_shop_id: userB.shopId,
    });
    expect(isFollowing).toBe(true);

    // Vérifier sur la boutique publique
    const { data: shop } = await anon
      .from("shops")
      .select("followers_count")
      .eq("id", userB.shopId)
      .single();
    expect(shop?.followers_count).toBe(result.followers_count);
  });

  it("2. permet à un client A de ne plus suivre la boutique (toggle) et décrémente followers_count", async () => {
    // Client A se désabonne de la boutique de B
    const { data, error } = await userA.client.rpc("toggle_follow_shop", {
      p_shop_id: userB.shopId,
    });

    expect(error).toBeNull();
    const result = data as { following: boolean; followers_count: number };
    expect(result.following).toBe(false);
    expect(result.followers_count).toBe(0);

    // Vérifier is_following_shop
    const { data: isFollowing } = await userA.client.rpc("is_following_shop", {
      p_shop_id: userB.shopId,
    });
    expect(isFollowing).toBe(false);
  });

  it("3. empêche un client de suivre deux fois la même boutique (contrainte unique)", async () => {
    // Réabonner A à B
    await userA.client.rpc("toggle_follow_shop", {
      p_shop_id: userB.shopId,
    });

    // Tentative d'insertion manuelle directe d'un second abonnement identique
    const { error } = await userA.client.from("shop_followers").insert({
      user_id: userA.id,
      shop_id: userB.shopId,
    });

    // Doit échouer sur la contrainte d'unicité
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/duplicate key|unique constraint|uq_shop_followers/i);
  });

  it("4. isole strictement les abonnements : le client B ne peut pas lire les abonnements de A", async () => {
    // Client B tente de lire la table shop_followers
    const { data: bFollows } = await userB.client
      .from("shop_followers")
      .select("*")
      .eq("user_id", userA.id);

    // RLS bloque : B ne voit aucun enregistrement de A
    expect(bFollows).toEqual([]);

    // Client B appelle get_my_followed_shops : ne voit rien car il ne suit personne
    const { data: myFollowed } = await userB.client.rpc("get_my_followed_shops");
    expect(myFollowed).toEqual([]);
  });

  it("5. interdit au commerçant de voir qui le suit (confidentialité absolue des abonnés)", async () => {
    // Commerçant B tente d'interroger shop_followers pour voir les abonnés de SA propre boutique
    const { data: ownerQuery } = await userB.client
      .from("shop_followers")
      .select("*")
      .eq("shop_id", userB.shopId);

    // RLS stricte : le commerçant ne voit AUCUNE ligne (retourne tableau vide)
    expect(ownerQuery).toEqual([]);

    // En revanche, il peut voir son compteur sur sa boutique
    const { data: myShop } = await userB.client
      .from("shops")
      .select("followers_count")
      .eq("id", userB.shopId)
      .single();
    expect(myShop?.followers_count).toBe(1);
  });

  it("6. get_followed_shops_products renvoie les produits de la boutique suivie", async () => {
    // Ajouter un produit disponible avec image pour la boutique de B
    const { data: product } = await userB.client
      .from("products")
      .insert({
        shop_id: userB.shopId,
        name: "Chaussures Sport Pro V3B",
        price: 25000,
        images: ["https://picsum.photos/400/400"],
        is_available: true,
        is_hidden: false,
      })
      .select("id")
      .single();

    expect(product).not.toBeNull();

    // Client A appelle get_followed_shops_products
    const { data: feedA } = await userA.client.rpc("get_followed_shops_products");
    const foundInA = (feedA as Array<{ product_id: string }>)?.find(
      (p) => p.product_id === product?.id
    );
    expect(foundInA).toBeDefined();

    // Client B (qui ne suit pas sa propre boutique) appelle get_followed_shops_products
    const { data: feedB } = await userB.client.rpc("get_followed_shops_products");
    const foundInB = (feedB as Array<{ product_id: string }>)?.find(
      (p) => p.product_id === product?.id
    );
    expect(foundInB).toBeUndefined();
  });

  it("7. masque les boutiques suspendues des boutiques suivies et du fil Explorer", async () => {
    // Suspendre la boutique B via admin
    await admin
      .from("shops")
      .update({ status: "suspended" })
      .eq("id", userB.shopId);

    // Client A appelle get_my_followed_shops : la boutique suspendue ne doit pas apparaître
    const { data: followed } = await userA.client.rpc("get_my_followed_shops");
    const foundFollowed = (followed as Array<{ shop_id: string }>)?.find(
      (s) => s.shop_id === userB.shopId
    );
    expect(foundFollowed).toBeUndefined();

    // Client A appelle get_followed_shops_products : les produits de la boutique suspendue ne doivent pas apparaître
    const { data: feed } = await userA.client.rpc("get_followed_shops_products");
    const foundProduct = (feed as Array<{ shop_id: string }>)?.find(
      (p) => p.shop_id === userB.shopId
    );
    expect(foundProduct).toBeUndefined();

    // Réactiver la boutique B
    await admin
      .from("shops")
      .update({ status: "active" })
      .eq("id", userB.shopId);
  });
});
