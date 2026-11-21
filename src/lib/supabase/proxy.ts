import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseCredentials } from "@/lib/constants";
import type { Database } from "@/types/database";

const PRIVATE_PREFIXES = ["/tableau-de-bord", "/onboarding", "/boutiques"];
const GUEST_ONLY = ["/connexion", "/inscription"];

/**
 * Rafraîchit la session Supabase à chaque requête et protège les routes privées.
 * Utilise systématiquement getSupabaseCredentials() pour pointer vers la vraie base
 * (et non un store d'intégration vide injecté par l'hébergeur).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, key: anonKey } = getSupabaseCredentials();

  const supabase = createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Important : ne rien exécuter entre createServerClient et getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  function redirectWithCookies(pathname: string) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname;
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (!user && PRIVATE_PREFIXES.some((p) => path.startsWith(p))) {
    return redirectWithCookies("/connexion");
  }

  if (user && request.method === "GET" && GUEST_ONLY.includes(path)) {
    return redirectWithCookies("/boutiques");
  }

  return response;
}
