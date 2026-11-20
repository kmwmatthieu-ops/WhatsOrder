import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("Anti-spam & Rate Limiting (Formulaire de commande)", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("autorise les premières requêtes sous le seuil", () => {
    const res1 = checkRateLimit("ip:127.0.0.1", 3, 60000);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit("ip:127.0.0.1", 3, 60000);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit("ip:127.0.0.1", 3, 60000);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("bloque la requête une fois la limite atteinte", () => {
    checkRateLimit("ip:192.168.1.1", 2, 60000);
    checkRateLimit("ip:192.168.1.1", 2, 60000);

    const blocked = checkRateLimit("ip:192.168.1.1", 2, 60000);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });

  it("isole les limites par clé distincte (IP ou téléphone)", () => {
    checkRateLimit("ip:10.0.0.1", 1, 60000);
    const blockedA = checkRateLimit("ip:10.0.0.1", 1, 60000);
    expect(blockedA.success).toBe(false);

    // Une autre IP n'est pas bloquée
    const allowedB = checkRateLimit("ip:10.0.0.2", 1, 60000);
    expect(allowedB.success).toBe(true);
  });
});
