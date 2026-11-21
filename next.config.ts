import type { NextConfig } from "next";

const SUPABASE_TARGET_URL = "https://hzexwajoxzhistuqleek.supabase.co";
const SUPABASE_TARGET_ANON_KEY = "sb_publishable_KEvtbCoSXw46eUJYhC_ttA_mWxk1UAn";

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const effectiveUrl =
  !envUrl || envUrl.includes("placeholder") || envUrl.includes("vkoocyynkjuyhalrgfoj")
    ? SUPABASE_TARGET_URL
    : envUrl;

const effectiveKey =
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (envUrl && envUrl.includes("vkoocyynkjuyhalrgfoj"))
    ? SUPABASE_TARGET_ANON_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const nextConfig: NextConfig = {
  // Verrouillage à la compilation des variables publiques vers le vrai projet Supabase
  env: {
    NEXT_PUBLIC_SUPABASE_URL: effectiveUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: effectiveKey,
  },
  // sharp est un module natif : on le laisse hors du bundle serveur.
  serverExternalPackages: ["sharp"],
  images: {
    // Les images sont déjà compressées en WebP à l'upload : pas de ré-optimisation.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "hzexwajoxzhistuqleek.supabase.co" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "flagcdn.com" },
    ],
  },
};

export default nextConfig;
