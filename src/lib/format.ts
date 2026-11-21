const fcfaFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Formate un montant entier en FCFA : 12500 → "12 500 FCFA".
 * Intl utilise une espace fine insécable ; on la normalise en espace insécable
 * classique (rendu identique sur tous les téléphones, pas de retour à la ligne).
 */
export function formatFCFA(amount: number): string {
  return `${fcfaFormatter.format(Math.round(amount)).replace(/[\u202F\u00A0 ]/g, "\u00A0")}\u00A0FCFA`;
}

/**
 * Calcule le prix réduit d'un produit en FCFA selon son pourcentage de réduction (0 à 90 %).
 * Formule identique à celle exécutée côté serveur dans place_order().
 */
export function applyDiscount(price: number, discountPercent?: number | null): number {
  const pct = discountPercent ?? 0;
  if (pct <= 0) return Math.round(price);
  return Math.max(1, Math.round((price * (100 - pct)) / 100));
}

/** Extrait un entier positif d'une saisie libre ("12 500" → 12500). Null si vide/invalide. */
export function parseAmount(input: string): number | null {
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isSafeInteger(n) ? n : null;
}
