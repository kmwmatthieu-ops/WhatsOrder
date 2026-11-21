import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { Database } from "@/types/database";

// Charger .env.test si présent
dotenv.config({ path: ".env.test" });

export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_SERVICE_ROLE_KEY &&
    !SUPABASE_URL.includes("xxxxxxxxxxxx") &&
    !SUPABASE_URL.includes("placeholder")
);

export function getAdminClient(): SupabaseClient<Database> {
  if (!isConfigured) throw new Error("Supabase non configuré pour les tests (.env.test requis).");
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getAnonClient(): SupabaseClient<Database> {
  if (!isConfigured) throw new Error("Supabase non configuré pour les tests.");
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type TestContext = {
  admin: SupabaseClient<Database>;
  userA: { id: string; email: string; client: SupabaseClient<Database>; shopId: string; shopSlug: string };
  userB: { id: string; email: string; client: SupabaseClient<Database>; shopId: string; shopSlug: string };
  anon: SupabaseClient<Database>;
};

export async function createTestUserWithShop(
  admin: SupabaseClient<Database>,
  prefix: string
) {
  const email = `test_${prefix}_${Date.now()}@example.com`;
  const password = "TestPassword123!";

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    throw new Error(`Impossible de créer l'utilisateur de test: ${authError?.message}`);
  }

  const userId = authData.user.id;

  // Créer un client authentifié pour cet utilisateur
  const userClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;

  // Créer sa boutique (slug strictement alphanumérique + tirets, sans underscore)
  const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9]/g, "");
  const slug = `shop-${cleanPrefix}-${Date.now().toString(36)}`.slice(0, 38);
  const { data: shop, error: shopError } = await userClient
    .from("shops")
    .insert({
      owner_id: userId,
      name: `Boutique ${prefix}`,
      slug,
      whatsapp_number: "+2250700000001",
    })
    .select("id")
    .single();

  if (shopError || !shop) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`Impossible de créer la boutique de test: ${shopError?.message}`);
  }

  return {
    id: userId,
    email,
    client: userClient,
    shopId: shop.id,
    shopSlug: slug,
  };
}

export async function cleanupTestUser(admin: SupabaseClient<Database>, userId: string) {
  try {
    // La suppression en cascade de l'utilisateur supprime sa boutique et ses produits
    await admin.auth.admin.deleteUser(userId);
  } catch {
    /* ignore cleanup errors */
  }
}
