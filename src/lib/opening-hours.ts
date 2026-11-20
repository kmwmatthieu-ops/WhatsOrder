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
 * Calcule si la boutique est actuellement ouverte selon les horaires configurés.
 */
export function isShopCurrentlyOpen(
  openingHours?: OpeningHours | null,
  now: Date = new Date()
): ShopOpenStatus {
  const hours = openingHours || DEFAULT_OPENING_HOURS;
  const currentDayIndex = now.getDay();
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

  const currentHours = String(now.getHours()).padStart(2, "0");
  const currentMinutes = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${currentHours}:${currentMinutes}`;

  const isOpen = currentTime >= daySchedule.start && currentTime <= daySchedule.end;

  return {
    isOpen,
    dayLabel,
    hoursText: `${daySchedule.start} - ${daySchedule.end}`,
  };
}
