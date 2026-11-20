import { describe, it, expect } from "vitest";
import { isShopCurrentlyOpen, DEFAULT_OPENING_HOURS } from "@/lib/opening-hours";
import type { OpeningHours } from "@/types/database";

describe("Horaires d'ouverture — isShopCurrentlyOpen", () => {
  const customHours: OpeningHours = {
    monday: { open: true, start: "09:00", end: "18:00" },
    tuesday: { open: true, start: "09:00", end: "18:00" },
    wednesday: { open: true, start: "09:00", end: "18:00" },
    thursday: { open: true, start: "09:00", end: "18:00" },
    friday: { open: true, start: "09:00", end: "18:00" },
    saturday: { open: false, start: "10:00", end: "15:00" },
    sunday: { open: false, start: "10:00", end: "15:00" },
  };

  it("détecte correctement une boutique ouverte pendant les heures d'ouverture", () => {
    // Lundi 14h30
    const mondayAfternoon = new Date("2026-11-23T14:30:00");
    const result = isShopCurrentlyOpen(customHours, mondayAfternoon);
    expect(result.isOpen).toBe(true);
    expect(result.dayLabel).toBe("Lundi");
    expect(result.hoursText).toBe("09:00 - 18:00");
  });

  it("détecte correctement une boutique fermée en dehors des heures", () => {
    // Lundi 20h00 (après fermeture)
    const mondayEvening = new Date("2026-11-23T20:00:00");
    const result = isShopCurrentlyOpen(customHours, mondayEvening);
    expect(result.isOpen).toBe(false);
    expect(result.dayLabel).toBe("Lundi");
  });

  it("détecte correctement une boutique fermée un jour de fermeture hebdomadaire", () => {
    // Samedi (jour fermé)
    const saturdayNoon = new Date("2026-11-28T12:00:00");
    const result = isShopCurrentlyOpen(customHours, saturdayNoon);
    expect(result.isOpen).toBe(false);
    expect(result.dayLabel).toBe("Samedi");
    expect(result.hoursText).toBe("Fermé aujourd'hui");
  });

  it("utilise les horaires par défaut si aucun horaire n'est renseigné", () => {
    const mondayMorning = new Date("2026-11-23T10:00:00");
    const result = isShopCurrentlyOpen(null, mondayMorning);
    expect(result.isOpen).toBe(true);
    expect(result.dayLabel).toBe("Lundi");
  });
});
