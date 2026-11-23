import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient, getMyShops } from "@/lib/supabase/server";

const ALLOWED_NEXT = ["/onboarding", "/nouveau-mot-de-passe", "/tableau-de-bord", "/boutiques"];

/**
 * Cible des liens e-mail (confirmation d'inscription, mot de passe oublié).
 * Supporte à la fois :
 * 1. Le flux PKCE (?code=...) envoyé par défaut par Supabase Auth (ConfirmationURL)
 * 2. Le flux token_hash (?token_hash=...&type=...) pour ouverture inter-navigateurs
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/onboarding";
  const next = ALLOWED_NEXT.includes(nextParam) ? nextParam : "/onboarding";

  const cookieStore = await cookies();
  const supabase = await createClient();
  let verified = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) verified = true;
  }

  if (!verified && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) verified = true;
  }

  // Pour le flux de réinitialisation de mot de passe :
  // Transmettre tous les paramètres (code, token_hash, etc.) et propager les cookies de session
  if (next === "/nouveau-mot-de-passe") {
    const targetUrl = new URL("/nouveau-mot-de-passe", request.url);
    request.nextUrl.searchParams.forEach((val, key) => {
      if (key !== "next") targetUrl.searchParams.set(key, val);
    });
    const response = NextResponse.redirect(targetUrl);
    cookieStore.getAll().forEach((c) => {
      response.cookies.set(c.name, c.value);
    });
    return response;
  }

  if (verified) {
    // Pour une confirmation d'inscription : si l'utilisateur n'a pas encore de boutique,
    // direction /onboarding pour créer sa boutique ; sinon /boutiques.
    const shops = await getMyShops();
    const target = shops.length > 0 ? "/boutiques" : "/onboarding";
    const response = NextResponse.redirect(new URL(target, request.url));
    cookieStore.getAll().forEach((c) => {
      response.cookies.set(c.name, c.value);
    });
    return response;
  }

  return NextResponse.redirect(new URL("/connexion?erreur=lien", request.url));
}
