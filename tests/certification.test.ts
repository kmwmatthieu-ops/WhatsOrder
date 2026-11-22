import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isConfigured,
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  type TestContext,
} from "./rls/helpers";

describe("Certification Commerçant & Badge Vérifié (V3-B)", () => {
  let ctx: TestContext;
  let adminUserId: string;
  let certId: string;

  beforeAll(async () => {
    if (!isConfigured) return;
    const admin = getAdminClient();
    const anon = getAnonClient();
    const userA = await createTestUserWithShop(admin, "cert_a");
    const userB = await createTestUserWithShop(admin, "cert_b");
    ctx = { admin, userA, userB, anon };

    adminUserId = userA.id;
    await admin.from("admins").insert({ user_id: adminUserId });
  });

  afterAll(async () => {
    if (!isConfigured || !ctx) return;
    if (certId) {
      await ctx.admin.from("shop_certifications").delete().eq("id", certId);
    }
    await ctx.admin.from("admins").delete().eq("user_id", adminUserId);
    await cleanupTestUser(ctx.admin, ctx.userA.id);
    await cleanupTestUser(ctx.admin, ctx.userB.id);
  });

  it("permet au commerçant A de soumettre sa demande de certification", async () => {
    if (!isConfigured) return;

    const { data, error } = await ctx.userA.client
      .from("shop_certifications")
      .insert({
        shop_id: ctx.userA.shopId,
        business_doc_url: "https://example.com/business.pdf",
        identity_doc_url: "https://example.com/id.pdf",
        store_photo_url: "https://example.com/photo.png",
        store_video_url: "https://example.com/video.mp4",
        status: "pending",
      })
      .select("id, status")
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe("pending");
    certId = data!.id;
  });

  it("interdit au commerçant B de lire ou modifier la demande de certification de A", async () => {
    if (!isConfigured) return;

    // Tentative de lecture par B
    const { data: readData } = await ctx.userB.client
      .from("shop_certifications")
      .select("*")
      .eq("id", certId);

    expect(readData?.length ?? 0).toBe(0);

    // Tentative de modification par B (bloquée par RLS)
    const { data: updateData } = await ctx.userB.client
      .from("shop_certifications")
      .update({ status: "approved" })
      .eq("id", certId)
      .select();

    expect(updateData?.length ?? 0).toBe(0);

    // Vérifier que le statut n'a pas été altéré dans la base
    const { data: certRow } = await ctx.admin
      .from("shop_certifications")
      .select("status")
      .eq("id", certId)
      .single();

    expect(certRow?.status).toBe("pending");
  });

  it("permet à l'administrateur de lister les certifications via admin_list_certifications", async () => {
    if (!isConfigured) return;

    const { data, error } = await ctx.userA.client.rpc("admin_list_certifications");

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    const found = (data as Array<{ id: string }>).find((c) => c.id === certId);
    expect(found).toBeDefined();
  });

  it("permet à l'administrateur de valider la certification et active shops.is_certified", async () => {
    if (!isConfigured) return;

    // Validation par admin
    const { data: ok, error } = await ctx.userA.client.rpc("admin_review_certification", {
      p_certification_id: certId,
      p_status: "approved",
      p_admin_notes: "Dossier conforme et complet.",
    });

    expect(error).toBeNull();
    expect(ok).toBe(true);

    // Vérifier que shops.is_certified est passé à true
    const { data: shop } = await ctx.admin
      .from("shops")
      .select("is_certified")
      .eq("id", ctx.userA.shopId)
      .single();

    expect(shop?.is_certified).toBe(true);
  });

  it("renvoie shop_is_certified = true dans get_explorer_products", async () => {
    if (!isConfigured) return;

    // Insérer un produit pour la boutique A
    await ctx.userA.client.from("products").insert({
      shop_id: ctx.userA.shopId,
      name: "Produit Certifié Test",
      price: 15000,
      is_available: true,
      is_hidden: false,
    });

    const { data: products, error } = await ctx.anon.rpc("get_explorer_products", {
      p_search: "Produit Certifié Test",
      p_category: null,
      p_limit: 10,
      p_offset: 0,
    });

    expect(error).toBeNull();
    const found = (products as Array<{ product_name: string; shop_is_certified?: boolean }>).find(
      (p) => p.product_name === "Produit Certifié Test"
    );
    expect(found).toBeDefined();
    expect(found?.shop_is_certified).toBe(true);
  });
});
