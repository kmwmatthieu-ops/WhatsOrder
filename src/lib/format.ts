const fcfaFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Formate un montant entier en FCFA : 12500 → "12 500 FCFA".
 * Intl utilise une espace fine insécable ; on la normalise en espace insécable
 * classique (rendu identique sur tous les téléphones, pas de retour à la ligne).
 */
export function formatFCFA(amount: number): string {
  return `${fcfaFormatter.format(Math.round(amount)).replace(/[\u202F\u00A0 ]/g, "\u00A0")}\u00A0FCFA`;
}

/** Extrait un entier positif d'une saisie libre ("12 500" → 12500). Null si vide/invalide. */
export function parseAmount(input: string): number | null {
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isSafeInteger(n) ? n : null;
}
