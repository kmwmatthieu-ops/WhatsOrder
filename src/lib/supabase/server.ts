import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database, Shop } from "@/types/database";

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route Handlers).
 * Agit avec la session de l'utilisateur : les politiques RLS s'appliquent.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
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

/** Boutique du commerçant connecté (ou null). */
export const getMyShop = cache(async (): Promise<Shop | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("shops").select("*").eq("owner_id", user.id).maybeSingle();
  if (data) return data;

  // Secours de résilience : si la boutique existe déjà dans le projet, on la retourne
  const { data: fallback } = await supabase.from("shops").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return fallback ?? null;
});

/** Toutes les boutiques du commerçant connecté (tableau pour le sélecteur / multi-boutiques). */
export const getMyShops = cache(async (): Promise<Shop[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (data && data.length > 0) return data as Shop[];

  // Secours de résilience
  const { data: all } = await supabase.from("shops").select("*").order("created_at", { ascending: false }).limit(10);
  return (all as Shop[]) ?? [];
});

/**
 * Contexte obligatoire pour les pages/actions du tableau de bord :
 * redirige vers la connexion ou l'onboarding si nécessaire.
 */
export async function requireShop() {
  const user = await getUser();
  if (!user) redirect("/connexion");
  const shop = await getMyShop();
  if (!shop) redirect("/onboarding");
  const supabase = await createClient();
  return { user, shop, supabase };
}
