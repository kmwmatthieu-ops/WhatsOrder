import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isConfigured,
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  type TestContext,
} from "./helpers";

describe("RLS — Protection de l'Espace Admin et Modération", () => {
  let ctx: TestContext;
  let adminUserId: string;

  beforeAll(async () => {
    if (!isConfigured) return;
    const admin = getAdminClient();
    const anon = getAnonClient();
    const userA = await createTestUserWithShop(admin, "adm_a");
    const userB = await createTestUserWithShop(admin, "adm_b");
    ctx = { admin, userA, userB, anon };

    // Enregistrer userA comme admin dans la table public.admins
    adminUserId = userA.id;
    await admin.from("admins").insert({ user_id: adminUserId });
  });

  afterAll(async () => {
    if (!isConfigured || !ctx) return;
    await ctx.admin.from("admins").delete().eq("user_id", adminUserId);
    await cleanupTestUser(ctx.admin, ctx.userA.id);
    await cleanupTestUser(ctx.admin, ctx.userB.id);
  });

  it("interdit à un utilisateur normal (non-admin) de lister les boutiques via admin_list_shops", async () => {
    if (!isConfigured) return;

    // userB n'est pas admin
    const { error } = await ctx.userB.client.rpc("admin_list_shops");
    expect(error).not.toBeNull();
  });

  it("interdit au public (anonyme) d'appeler admin_list_shops", async () => {
    if (!isConfigured) return;

    const { error } = await ctx.anon.rpc("admin_list_shops");
    expect(error).not.toBeNull();
  });

  it("permet à l'administrateur de lister les boutiques et de voir les statuts", async () => {
    if (!isConfigured) return;

    const { data, error } = await ctx.userA.client.rpc("admin_list_shops");
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
  });

  it("permet à l'administrateur de suspendre et réactiver une boutique", async () => {
    if (!isConfigured) return;

    // Admin suspend la boutique de B
    const { error: suspendErr } = await ctx.userA.client
      .from("shops")
      .update({ status: "suspended" })
      .eq("id", ctx.userB.shopId);

    expect(suspendErr).toBeNull();

    // Vérifier que la boutique est suspendue
    const { data: suspendedShop } = await ctx.admin
      .from("shops")
      .select("status")
      .eq("id", ctx.userB.shopId)
      .single();

    expect(suspendedShop?.status).toBe("suspended");

    // Admin réactive la boutique de B
    const { error: reactivateErr } = await ctx.userA.client
      .from("shops")
      .update({ status: "active" })
      .eq("id", ctx.userB.shopId);

    expect(reactivateErr).toBeNull();

    const { data: activeShop } = await ctx.admin
      .from("shops")
      .select("status")
      .eq("id", ctx.userB.shopId)
      .single();

    expect(activeShop?.status).toBe("active");
  });

  it("interdit à un non-admin de lister les comptes administrateurs", async () => {
    if (!isConfigured) return;

    const { error } = await ctx.userB.client.rpc("admin_list_admins");
    expect(error).not.toBeNull();
  });

  it("permet à l'administrateur de lister les administrateurs et applique le quota max de 2", async () => {
    if (!isConfigured) return;

    const { data: list, error: listErr } = await ctx.userA.client.rpc("admin_list_admins");
    expect(listErr).toBeNull();
    expect(list).not.toBeNull();
    expect(list!.length).toBeGreaterThanOrEqual(1);

    // Tentative d'ajout si le quota de 2 est atteint
    if (list!.length >= 2) {
      const { data: addRes } = await ctx.userA.client.rpc("admin_add_admin_by_email", {
        p_email: ctx.userB.email,
      });
      const res = addRes as { ok: boolean; error?: string };
      expect(res.ok).toBe(false);
      expect(res.error).toContain("quota maximal de 2 administrateurs");
    }
  });

  it("interdit de supprimer le dernier compte administrateur", async () => {
    if (!isConfigured) return;

    // Tentative de suppression alors qu'il n'y a qu'1 seul admin (ou si on teste avec 1 admin)
    // On s'assure que admin_remove_admin refuse si count <= 1
    const { data: list } = await ctx.userA.client.rpc("admin_list_admins");
    if (list && list.length === 1) {
      const { data: removeRes } = await ctx.userA.client.rpc("admin_remove_admin", {
        p_user_id: list[0].user_id,
      });
      const res = removeRes as { ok: boolean; error?: string };
      expect(res.ok).toBe(false);
      expect(res.error).toContain("au moins un administrateur");
    }
  });
});
