/** Même règle qu'en SQL : 3 à 40 caractères, minuscules, chiffres, tirets (pas en début/fin, pas de "--"). */
export const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/;

/** Doit rester identique à public.is_reserved_slug() (migration schema). */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "auth", "connexion", "inscription", "mot-de-passe-oublie",
  "nouveau-mot-de-passe", "onboarding", "tableau-de-bord", "dashboard", "app",
  "login", "signup", "compte", "aide", "support", "contact", "tarifs", "cgu",
  "confidentialite", "boutique", "boutiques", "commande", "commandes", "panier",
  "static", "assets", "images", "favicon", "robots", "sitemap", "www", "mail",
]);

/** "Chez Awa – Mode & Beauté" → "chez-awa-mode-beaute" */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/, "");
}

/**
 * Nettoyage pendant la frappe : comme slugify mais SANS retirer le tiret final
 * (sinon impossible de taper "ma-boutique" caractère par caractère).
 */
export function sanitizeSlugInput(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "")
    .slice(0, 40);
}

export type SlugProblem = "too_short" | "too_long" | "format" | "reserved" | null;

/** Validation locale (avant l'appel réseau de disponibilité). */
export function slugProblem(slug: string): SlugProblem {
  if (slug.length < 3) return "too_short";
  if (slug.length > 40) return "too_long";
  if (!SLUG_REGEX.test(slug) || slug.includes("--")) return "format";
  if (RESERVED_SLUGS.has(slug)) return "reserved";
  return null;
}

export const SLUG_PROBLEM_MESSAGES: Record<Exclude<SlugProblem, null>, string> = {
  too_short: "Au moins 3 caractères.",
  too_long: "40 caractères maximum.",
  format: "Uniquement lettres minuscules, chiffres et tirets (pas au début ni à la fin).",
  reserved: "Ce lien est réservé, choisissez-en un autre.",
};
