import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isConfigured,
  getAdminClient,
  createTestUserWithShop,
  cleanupTestUser,
  type TestContext,
} from "./helpers";
import { MEDIA_BUCKET } from "@/lib/constants";

describe("RLS — Stockage des médias (Storage)", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    if (!isConfigured) return;
    const admin = getAdminClient();
    const userA = await createTestUserWithShop(admin, "sto_a");
    const userB = await createTestUserWithShop(admin, "sto_b");
    ctx = { admin, userA, userB, anon: admin };
  });

  afterAll(async () => {
    if (!isConfigured || !ctx) return;
    await cleanupTestUser(ctx.admin, ctx.userA.id);
    await cleanupTestUser(ctx.admin, ctx.userB.id);
  });

  it("empêche A d'uploader un fichier dans le dossier de la boutique B", async () => {
    if (!isConfigured) return;

    const dummyFile = Buffer.from("fake-webp-bytes");
    const targetPath = `${ctx.userB.shopId}/products/pirated.webp`;

    const { error } = await ctx.userA.client.storage
      .from(MEDIA_BUCKET)
      .upload(targetPath, dummyFile, { contentType: "image/webp" });

    expect(error).not.toBeNull();
  });

  it("permet à A d'uploader un fichier dans son propre dossier", async () => {
    if (!isConfigured) return;

    const dummyFile = Buffer.from("fake-webp-bytes");
    const targetPath = `${ctx.userA.shopId}/products/legit.webp`;

    const { error } = await ctx.userA.client.storage
      .from(MEDIA_BUCKET)
      .upload(targetPath, dummyFile, { contentType: "image/webp" });

    expect(error).toBeNull();

    // Nettoyer
    await ctx.userA.client.storage.from(MEDIA_BUCKET).remove([targetPath]);
  });
});
