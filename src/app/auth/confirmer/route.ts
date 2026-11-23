import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient, getMyShops } from "@/lib/supabase/server";

const ALLOWED_NEXT = [
  "/onboarding",
  "/nouveau-mot-de-passe",
  "/tableau-de-bord",
  "/boutiques",
  "/explorer",
  "/compte/boutiques",
];

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

  // Récupération des erreurs renvoyées par le fournisseur OAuth ou Supabase
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const errorCode = searchParams.get("error_code");

  if (errorParam || errorDescription) {
    console.error("OAuth provider error:", { errorParam, errorDescription, errorCode });
    const targetUrl = new URL("/connexion", request.url);
    const detail = errorDescription || errorParam || "Erreur de connexion avec le fournisseur.";
    targetUrl.searchParams.set("erreur_detail", detail);
    return NextResponse.redirect(targetUrl);
  }

  const cookieStore = await cookies();
  const supabase = await createClient();
  let verified = false;
  let exchangeErrorMsg: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      verified = true;
    } else {
      console.error("Erreur exchangeCodeForSession:", error);
      exchangeErrorMsg = error.message;
    }
  }

  if (!verified && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      verified = true;
    } else {
      console.error("Erreur verifyOtp:", error);
      exchangeErrorMsg = error.message;
    }
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
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.user_name;
        if (fullName) {
          await supabase.from("customer_profiles").upsert(
            {
              id: user.id,
              full_name: fullName,
              activity_consent: true,
              personalization_enabled: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id", ignoreDuplicates: true }
          );
        }
      }
    } catch {
      // Initialisation du profil optionnelle, non-bloquante
    }

    if (next === "/explorer" || next === "/compte/boutiques") {
      const response = NextResponse.redirect(new URL(next, request.url));
      cookieStore.getAll().forEach((c) => {
        response.cookies.set(c.name, c.value);
      });
      return response;
    }

    // Pour une confirmation d'inscription ou OAuth : si l'utilisateur n'a pas encore de boutique,
    // direction /onboarding pour créer sa boutique ; sinon /boutiques.
    const shops = await getMyShops();
    const target = shops.length > 0 ? (next === "/onboarding" ? "/boutiques" : next) : "/onboarding";
    const response = NextResponse.redirect(new URL(target, request.url));
    cookieStore.getAll().forEach((c) => {
      response.cookies.set(c.name, c.value);
    });
    return response;
  }

  const targetUrl = new URL("/connexion", request.url);
  if (exchangeErrorMsg) {
    targetUrl.searchParams.set("erreur_detail", exchangeErrorMsg);
  } else {
    targetUrl.searchParams.set("erreur", "lien");
  }
  return NextResponse.redirect(targetUrl);
}
