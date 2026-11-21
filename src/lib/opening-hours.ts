import type { DaySchedule, OpeningHours } from "@/types/database";

export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export const DAYS_OF_WEEK: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_LABELS_FR: Record<DayKey, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: { open: true, start: "08:00", end: "19:00" },
  tuesday: { open: true, start: "08:00", end: "19:00" },
  wednesday: { open: true, start: "08:00", end: "19:00" },
  thursday: { open: true, start: "08:00", end: "19:00" },
  friday: { open: true, start: "08:00", end: "19:00" },
  saturday: { open: true, start: "09:00", end: "18:00" },
  sunday: { open: false, start: "09:00", end: "18:00" },
};

const DAY_INDEX_MAP: Record<number, DayKey> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export type ShopOpenStatus = {
  isOpen: boolean;
  dayLabel: string;
  hoursText: string;
};

/**
 * Détermine le fuseau horaire IANA de la boutique selon l'indicatif de son numéro WhatsApp
 * afin que le serveur (en UTC sur Vercel) et le navigateur client évaluent exactement la même heure locale.
 */
function resolveShopTimeZone(whatsappNumber?: string | null): string | undefined {
  if (!whatsappNumber) return undefined;
  const digits = whatsappNumber.replace(/\D/g, "");
  // Afrique Centrale / Ouest UTC+1 (Gabon 241, Cameroun 237, Congo 242, RDC Ouest 243, RCA 236, Tchad 235, Bénin 229, Niger 227)
  if (/^(241|237|242|243|236|235|229|227)/.test(digits)) {
    return "Africa/Libreville";
  }
  // Afrique de l'Ouest UTC+0 (Côte d'Ivoire 225, Sénégal 221, Mali 223, Burkina 226, Togo 228, Guinée 224)
  if (/^(225|221|223|226|228|224)/.test(digits)) {
    return "Africa/Abidjan";
  }
  // France / Europe
  if (digits.startsWith("33")) {
    return "Europe/Paris";
  }
  return undefined;
}

/**
 * Calcule si la boutique est actuellement ouverte selon les horaires configurés.
 */
export function isShopCurrentlyOpen(
  openingHours?: OpeningHours | null,
  now: Date = new Date(),
  whatsappNumber?: string | null
): ShopOpenStatus {
  const hours = openingHours || DEFAULT_OPENING_HOURS;

  let currentDayIndex = now.getDay();
  let currentHours = String(now.getHours()).padStart(2, "0");
  let currentMinutes = String(now.getMinutes()).padStart(2, "0");

  const tz = resolveShopTimeZone(whatsappNumber);
  if (tz) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(now);

      const weekday = parts.find((p) => p.type === "weekday")?.value;
      const hourPart = parts.find((p) => p.type === "hour")?.value;
      const minutePart = parts.find((p) => p.type === "minute")?.value;

      const weekdayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      if (weekday && weekday in weekdayMap) {
        currentDayIndex = weekdayMap[weekday];
      }
      if (hourPart) {
        currentHours = hourPart === "24" ? "00" : hourPart.padStart(2, "0");
      }
      if (minutePart) {
        currentMinutes = minutePart.padStart(2, "0");
      }
    } catch {
      /* fallback sur l'heure locale de l'environnement */
    }
  }

  const currentDayKey = DAY_INDEX_MAP[currentDayIndex];
  const daySchedule: DaySchedule = hours[currentDayKey] || { open: false, start: "08:00", end: "19:00" };

  const dayLabel = DAY_LABELS_FR[currentDayKey];

  if (!daySchedule.open) {
    return {
      isOpen: false,
      dayLabel,
      hoursText: "Fermé aujourd'hui",
    };
  }

  const currentTime = `${currentHours}:${currentMinutes}`;
  const isOpen = currentTime >= daySchedule.start && currentTime <= daySchedule.end;

  return {
    isOpen,
    dayLabel,
    hoursText: `${daySchedule.start} - ${daySchedule.end}`,
  };
}
