import type { NextConfig } from "next";

// Domaine Supabase autorisé pour <Image> (logos et photos produits).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const nextConfig: NextConfig = {
  // sharp est un module natif : on le laisse hors du bundle serveur.
  serverExternalPackages: ["sharp"],
  images: {
    // Les images sont déjà compressées en WebP à l'upload : pas de ré-optimisation
    // (évite le double traitement et la consommation du quota d'optimisation).
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: supabaseHost }],
  },
};

export default nextConfig;
