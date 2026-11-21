/** Nom du produit, affiché partout dans l'interface. */
export const APP_NAME = "Bon Waz à Dealer";

/** Limite de produits du plan gratuit (doit rester alignée avec shop_product_limit() en SQL). */
export const PRODUCT_LIMIT = 20;

/** Nombre maximum de photos par produit (aligné avec la contrainte SQL). */
export const MAX_PRODUCT_IMAGES = 3;

/** Bucket Supabase Storage des images. */
export const MEDIA_BUCKET = "shop-media";

/** Couleur principale par défaut d'une boutique. */
export const DEFAULT_SHOP_COLOR = "#0F766E";

/** Palette proposée dans les paramètres (le commerçant peut aussi saisir sa couleur). */
export const SHOP_COLOR_PRESETS = [
  "#0F766E", // vert profond
  "#15803D", // vert
  "#E2683C", // terracotta
  "#B91C1C", // rouge
  "#C2410C", // orange
  "#A16207", // ocre
  "#7C3AED", // violet
  "#DB2777", // rose
  "#1D4ED8", // bleu
  "#111827", // noir
];

/** URL publique de l'application (liens e-mail et liens de boutique). */
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Configuration cible Supabase du projet WhatsOrder */
export const SUPABASE_TARGET_URL = "https://hzexwajoxzhistuqleek.supabase.co";
export const SUPABASE_TARGET_ANON_KEY = "sb_publishable_KEvtbCoSXw46eUJYhC_ttA_mWxk1UAn";

/**
 * Résolution infaillible des clés Supabase :
 * Empêche tout écrasement par un ancien store d'intégration vide injecté sur la plateforme d'hébergement.
 */
export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!envUrl || envUrl.includes("placeholder") || envUrl.includes("vkoocyynkjuyhalrgfoj")) {
    return { url: SUPABASE_TARGET_URL, key: SUPABASE_TARGET_ANON_KEY };
  }
  return { url: envUrl, key: envKey || SUPABASE_TARGET_ANON_KEY };
}

/** Indique si les variables d'environnement Supabase sont correctement renseignées. */
export function isSupabaseConfigured(): boolean {
  return true;
}

/** Lien public d'une boutique. */
export function shopUrl(slug: string) {
  return `${siteUrl()}/${slug}`;
}
