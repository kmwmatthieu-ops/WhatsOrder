import type { NextConfig } from "next";

const SUPABASE_TARGET_URL = "https://hzexwajoxzhistuqleek.supabase.co";
const SUPABASE_TARGET_ANON_KEY = "sb_publishable_KEvtbCoSXw46eUJYhC_ttA_mWxk1UAn";
const PRODUCTION_SITE_URL = "https://bonwazadealer.vercel.app";

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

const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const effectiveSiteUrl =
  envSiteUrl && !envSiteUrl.includes("localhost")
    ? envSiteUrl
    : process.env.NODE_ENV === "production"
      ? PRODUCTION_SITE_URL
      : envSiteUrl || "http://localhost:3000";

const nextConfig: NextConfig = {
  // Verrouillage à la compilation des variables publiques vers le vrai projet Supabase et le domaine public
  env: {
    NEXT_PUBLIC_SUPABASE_URL: effectiveUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: effectiveKey,
    NEXT_PUBLIC_SITE_URL: effectiveSiteUrl,
  },
  // sharp est un module natif : on le laisse hors du bundle serveur.
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "60mb",
    },
  },
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
