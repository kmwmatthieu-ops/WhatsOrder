/** Indicatifs proposés (zone FCFA en tête, puis voisins fréquents). */
export const COUNTRIES = [
  { code: "225", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "221", name: "Sénégal", flag: "🇸🇳" },
  { code: "237", name: "Cameroun", flag: "🇨🇲" },
  { code: "229", name: "Bénin", flag: "🇧🇯" },
  { code: "228", name: "Togo", flag: "🇹🇬" },
  { code: "226", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "223", name: "Mali", flag: "🇲🇱" },
  { code: "227", name: "Niger", flag: "🇳🇪" },
  { code: "245", name: "Guinée-Bissau", flag: "🇬🇼" },
  { code: "241", name: "Gabon", flag: "🇬🇦" },
  { code: "242", name: "Congo", flag: "🇨🇬" },
  { code: "235", name: "Tchad", flag: "🇹🇩" },
  { code: "236", name: "Centrafrique", flag: "🇨🇫" },
  { code: "240", name: "Guinée équatoriale", flag: "🇬🇶" },
  { code: "224", name: "Guinée", flag: "🇬🇳" },
  { code: "243", name: "RD Congo", flag: "🇨🇩" },
  { code: "222", name: "Mauritanie", flag: "🇲🇷" },
  { code: "212", name: "Maroc", flag: "🇲🇦" },
  { code: "33", name: "France", flag: "🇫🇷" },
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
