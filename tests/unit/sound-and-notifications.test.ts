import { describe, it, expect, vi } from "vitest";
import { playOrderChime, updateAppBadge, clearAppBadge, triggerHapticFeedback } from "@/lib/sound";

describe("Notifications de commande & Alertes sonores", () => {
  it("gère playOrderChime gracieusement sans erreur dans l'environnement de test", () => {
    const res = playOrderChime();
    // En environnement de test Node/JSDOM, AudioContext n'est pas présent par défaut
    expect(typeof res).toBe("boolean");
  });

  it("met à jour et efface le badge d'application sans erreur", () => {
    const setAppBadgeMock = vi.fn().mockResolvedValue(undefined);
    const clearAppBadgeMock = vi.fn().mockResolvedValue(undefined);

    // Mock navigator.setAppBadge et clearAppBadge
    Object.defineProperty(global.navigator, "setAppBadge", {
      value: setAppBadgeMock,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global.navigator, "clearAppBadge", {
      value: clearAppBadgeMock,
      writable: true,
      configurable: true,
    });

    updateAppBadge(3);
    expect(setAppBadgeMock).toHaveBeenCalledWith(3);

    updateAppBadge(0);
    expect(clearAppBadgeMock).toHaveBeenCalled();

    clearAppBadge();
    expect(clearAppBadgeMock).toHaveBeenCalledTimes(2);
  });

  it("gère triggerHapticFeedback sans erreur", () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(global.navigator, "vibrate", {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    triggerHapticFeedback();
    expect(vibrateMock).toHaveBeenCalled();
  });
});
