import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl, PRODUCTION_SITE_URL } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/boutiques";

  // Détermination de l'origine publique sécurisée
  let origin = request.nextUrl.origin;
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    origin = siteUrl();
  }
  if (origin.includes("localhost") && process.env.NODE_ENV === "production") {
    origin = PRODUCTION_SITE_URL;
  }

  const redirectTo = `${origin}/auth/confirmer?next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: {
      redirectTo,
      scopes: "email,public_profile",
    },
  });

  if (error || !data?.url) {
    console.error("Erreur initialisation Facebook OAuth:", error);
    const backTo = next === "/explorer" ? "/compte/connexion" : "/connexion";
    const errorUrl = new URL(backTo, origin);
    errorUrl.searchParams.set("erreur", "oauth_facebook");
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(data.url);
}
