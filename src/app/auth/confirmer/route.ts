import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_NEXT = ["/onboarding", "/nouveau-mot-de-passe", "/tableau-de-bord", "/boutiques"];

/**
 * Cible des liens e-mail (confirmation d'inscription, mot de passe oublié).
 * Flux token_hash : fonctionne même si le lien est ouvert dans un autre
 * navigateur que celui de l'inscription (navigateur intégré de Gmail, etc.).
 *
 * Templates Supabase attendus (voir supabase/templates) :
 *   {{ .SiteURL }}/auth/confirmer?token_hash={{ .TokenHash }}&type=email&next=/onboarding
 *   {{ .SiteURL }}/auth/confirmer?token_hash={{ .TokenHash }}&type=recovery&next=/nouveau-mot-de-passe
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/tableau-de-bord";
  // Anti open-redirect : seulement des chemins internes connus.
  const next = ALLOWED_NEXT.includes(nextParam) ? nextParam : "/tableau-de-bord";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL("/connexion?erreur=lien", request.url));
}
