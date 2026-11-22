import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getAdminClient,
  getAnonClient,
  createTestUserWithShop,
  cleanupTestUser,
  isConfigured,
} from "./rls/helpers";

describe("Admin — Statistiques Utilisateurs & Diagramme Comptable / Activité", () => {
  if (!isConfigured) {
    it.skip("Supabase non configuré pour les tests distants", () => {});
    return;
  }

  const admin = getAdminClient();
  const anon = getAnonClient();
  let merchant: Awaited<ReturnType<typeof createTestUserWithShop>>;

  beforeAll(async () => {
    merchant = await createTestUserWithShop(admin, "admin_stats_merchant");
  });

  afterAll(async () => {
    if (merchant) await cleanupTestUser(admin, merchant.id);
  });

  it("interdit à un utilisateur non-admin d'accéder aux statistiques utilisateurs", async () => {
    if (!isConfigured) return;
    const anon = getAnonClient();
    const { data, error } = await anon.rpc("admin_get_users_stats");

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("interdit à un utilisateur non-admin d'accéder à la chronologie comptable", async () => {
    if (!isConfigured) return;
    const { data, error } = await merchant.client.rpc("admin_get_accounting_timeline");

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("permet à l'administrateur de récupérer les statistiques utilisateurs détaillées", async () => {
    if (!isConfigured) return;
    const { data, error } = await admin.rpc("admin_get_users_stats");

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.length).toBe(1);
    expect(data![0].total_users).toBeGreaterThan(0);
    expect(data![0].merchants_count).toBeGreaterThan(0);
  });

  it("permet à l'administrateur de récupérer la chronologie comptable pour le diagramme en courbe", async () => {
    if (!isConfigured) return;
    const { data, error } = await admin.rpc("admin_get_accounting_timeline");

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect((data as any).orders).toBeDefined();
    expect(Array.isArray((data as any).orders)).toBe(true);
    expect((data as any).subscriptions).toBeDefined();
    expect(Array.isArray((data as any).subscriptions)).toBe(true);
  });
});
