/** Indicatifs proposés (zone FCFA en tête, puis voisins fréquents). */
export const COUNTRIES = [
  { code: "225", name: "Côte d'Ivoire", iso: "ci", flag: "🇨🇮" },
  { code: "221", name: "Sénégal", iso: "sn", flag: "🇸🇳" },
  { code: "237", name: "Cameroun", iso: "cm", flag: "🇨🇲" },
  { code: "229", name: "Bénin", iso: "bj", flag: "🇧🇯" },
  { code: "228", name: "Togo", iso: "tg", flag: "🇹🇬" },
  { code: "226", name: "Burkina Faso", iso: "bf", flag: "🇧🇫" },
  { code: "223", name: "Mali", iso: "ml", flag: "🇲🇱" },
  { code: "227", name: "Niger", iso: "ne", flag: "🇳🇪" },
  { code: "245", name: "Guinée-Bissau", iso: "gw", flag: "🇬🇼" },
  { code: "241", name: "Gabon", iso: "ga", flag: "🇬🇦" },
  { code: "242", name: "Congo", iso: "cg", flag: "🇨🇬" },
  { code: "235", name: "Tchad", iso: "td", flag: "🇹🇩" },
  { code: "236", name: "Centrafrique", iso: "cf", flag: "🇨🇫" },
  { code: "240", name: "Guinée équatoriale", iso: "gq", flag: "🇬🇶" },
  { code: "224", name: "Guinée", iso: "gn", flag: "🇬🇳" },
  { code: "243", name: "RD Congo", iso: "cd", flag: "🇨🇩" },
  { code: "222", name: "Mauritanie", iso: "mr", flag: "🇲🇷" },
  { code: "212", name: "Maroc", iso: "ma", flag: "🇲🇦" },
  { code: "33", name: "France", iso: "fr", flag: "🇫🇷" },
] as const;

export const DEFAULT_COUNTRY_CODE = "225";

export const E164_REGEX = /^\+[1-9][0-9]{7,14}$/;

/**
 * Construit un numéro E.164 depuis un indicatif et une saisie locale.
 * - On garde le 0 initial (en Côte d'Ivoire, il fait partie du numéro).
 * - Si la saisie commence par "+" ou "00", on la considère déjà internationale.
 */
export function toE164(countryCode: string, local: string): string {
  const raw = local.trim();
  if (raw.startsWith("+")) return "+" + raw.replace(/\D/g, "");
  if (raw.startsWith("00")) return "+" + raw.slice(2).replace(/\D/g, "");
  return "+" + countryCode + raw.replace(/\D/g, "");
}

export function isValidE164(value: string): boolean {
  return E164_REGEX.test(value);
}

/** Sépare un numéro E.164 en (indicatif connu, partie locale) pour l'édition. */
export function splitE164(value: string): { countryCode: string; local: string } {
  const digits = value.replace(/^\+/, "");
  // Indicatifs les plus longs d'abord (ex. "225" avant "22").
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  const match = sorted.find((c) => digits.startsWith(c.code));
  if (match) return { countryCode: match.code, local: digits.slice(match.code.length) };
  return { countryCode: DEFAULT_COUNTRY_CODE, local: value }; // saisie "+xxx" conservée telle quelle
}

/** Affichage lisible : "+225 07 01 02 03 04". */
export function formatPhone(value: string): string {
  const { countryCode, local } = splitE164(value);
  if (local.startsWith("+")) return local;
  return `+${countryCode} ${local.replace(/(\d{2})(?=\d)/g, "$1 ")}`.trim();
}
