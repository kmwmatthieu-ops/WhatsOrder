import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseCredentials } from "@/lib/constants";
import type { Database } from "@/types/database";

const PRIVATE_PREFIXES = ["/tableau-de-bord", "/onboarding", "/boutiques"];
const GUEST_ONLY = ["/connexion", "/inscription"];

/**
 * Rafraîchit la session Supabase à chaque requête et protège les routes privées.
 * Utilise systématiquement getSupabaseCredentials() pour pointer vers la vraie base.
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
  const isRscOrPrefetch =
    request.headers.get("rsc") === "1" ||
    request.headers.has("next-router-prefetch") ||
    request.headers.has("next-router-segment-prefetch") ||
    request.headers.get("purpose") === "prefetch";

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

  // Sur une navigation document directe (hors requête RSC/prefetch qui casserait l'arbre
  // du layout (auth) dans Next.js 16), on redirige immédiatement vers /boutiques.
  // Sur une transition RSC, SignInForm / SignUpForm redirige proprement via window.location.replace("/boutiques").
  if (user && request.method === "GET" && !isRscOrPrefetch && GUEST_ONLY.includes(path)) {
    return redirectWithCookies("/boutiques");
  }

  return response;
}
