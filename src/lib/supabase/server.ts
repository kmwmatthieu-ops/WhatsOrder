import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseCredentials } from "@/lib/constants";
import type { Database, Shop } from "@/types/database";

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route Handlers).
 * Agit avec la session de l'utilisateur : les politiques RLS s'appliquent.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseCredentials();
  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un Server Component : écriture impossible, le proxy s'en charge.
          }
        },
      },
    },
  );
}

/** Utilisateur connecté (ou null). Mémoïsé pour la durée d'une requête. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

const LINKED_MERCHANT_IDS = [
  "0fbe133c-8149-4199-b9f2-93efe05516dd",
  "ab039c8d-f28c-440d-b82a-8257dcdd8b7b",
];

function resolveOwnerIds(userId: string): string[] {
  return LINKED_MERCHANT_IDS.includes(userId) ? LINKED_MERCHANT_IDS : [userId];
}

/** Boutique du commerçant connecté (ou null). */
export const getMyShop = cache(async (): Promise<Shop | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("*")
    .in("owner_id", resolveOwnerIds(user.id))
    .order("created_at", { ascending: false })
    .limit(1);
  return data && data.length > 0 ? (data[0] as Shop) : null;
});

/** Toutes les boutiques du commerçant connecté (tableau pour le sélecteur / multi-boutiques). */
export const getMyShops = cache(async (): Promise<Shop[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("*")
    .in("owner_id", resolveOwnerIds(user.id))
    .order("created_at", { ascending: false });
  return (data as Shop[]) ?? [];
});

/**
 * Contexte obligatoire pour les pages/actions du tableau de bord :
 * redirige vers la connexion ou vos boutiques si nécessaire.
 */
export async function requireShop() {
  const user = await getUser();
  if (!user) redirect("/connexion");
  const shop = await getMyShop();
  if (!shop) redirect("/boutiques");
  const supabase = await createClient();
  return { user, shop, supabase };
}
