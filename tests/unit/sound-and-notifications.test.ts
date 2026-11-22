import { describe, it, expect, vi } from "vitest";
import { playOrderChime, updateAppBadge, clearAppBadge, triggerHapticFeedback, sendSystemNotification } from "@/lib/sound";
import { FEATURES, isFeatureEnabled } from "@/config/features";

describe("Notifications de commande & Alertes sonores", () => {
  it("vérifie que les fonctionnalités 57 et 58 sont masquées par défaut dans les feature flags", () => {
    expect(FEATURES.ENABLE_ORDER_AUDIO_AND_VISUAL_ALERTS).toBe(false);
    expect(FEATURES.ENABLE_WEB_PUSH_NOTIFICATIONS).toBe(false);
    expect(isFeatureEnabled("ENABLE_ORDER_AUDIO_AND_VISUAL_ALERTS")).toBe(false);
    expect(isFeatureEnabled("ENABLE_WEB_PUSH_NOTIFICATIONS")).toBe(false);
  });

  it("neutralise playOrderChime lorsque la fonctionnalité 57 est masquée", () => {
    const res = playOrderChime();
    expect(res).toBe(false);
  });

  it("neutralise updateAppBadge lorsque la fonctionnalité 57 est masquée", () => {
    const setAppBadgeMock = vi.fn().mockResolvedValue(undefined);
    const clearAppBadgeMock = vi.fn().mockResolvedValue(undefined);

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
    // Masqué : la méthode ne doit pas être appelée
    expect(setAppBadgeMock).not.toHaveBeenCalled();
  });

  it("neutralise triggerHapticFeedback lorsque la fonctionnalité 57 est masquée", () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(global.navigator, "vibrate", {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    triggerHapticFeedback();
    // Masqué : le vibreur ne doit pas être sollicité
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it("neutralise sendSystemNotification lorsque la fonctionnalité 58 est masquée", async () => {
    const res = await sendSystemNotification("Test");
    expect(res).toBe(false);
  });
});
