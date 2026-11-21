import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import {
  formatSaspayAmount,
  verifySaspayWebhookSignature,
  getSaspayApiKey,
  getSaspayWebhookSecret,
} from "@/lib/saspay/client";
import { SaspayApiError } from "@/lib/saspay/types";

describe("SasPay Integration - Spécifications & Règles Strictes", () => {
  describe("1. Montants en chaînes décimales (Format strict '2500.00')", () => {
    it("doit formater les nombres entiers avec deux décimales", () => {
      expect(formatSaspayAmount(2500)).toBe("2500.00");
      expect(formatSaspayAmount(5000)).toBe("5000.00");
      expect(formatSaspayAmount(12000)).toBe("12000.00");
      expect(formatSaspayAmount(144000)).toBe("144000.00");
    });

    it("doit formater les chaînes numériques en chaînes décimales à 2 chiffres", () => {
      expect(formatSaspayAmount("2500")).toBe("2500.00");
      expect(formatSaspayAmount("5000.5")).toBe("5000.50");
      expect(formatSaspayAmount("2500.00")).toBe("2500.00");
    });

    it("doit rejeter les montants nuls ou négatifs", () => {
      expect(() => formatSaspayAmount(0)).toThrow();
      expect(() => formatSaspayAmount(-50)).toThrow();
      expect(() => formatSaspayAmount("abc")).toThrow();
    });
  });

  describe("2. Variables d'environnement & Secrets", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    it("doit lever une erreur explicite si SASPAY_API_KEY est absente", () => {
      delete process.env.SASPAY_API_KEY;
      expect(() => getSaspayApiKey()).toThrowError(/SASPAY_API_KEY n'est pas configurée/);
    });

    it("doit lever une erreur explicite si SASPAY_WEBHOOK_SECRET est absent", () => {
      delete process.env.SASPAY_WEBHOOK_SECRET;
      expect(() => getSaspayWebhookSecret()).toThrowError(/SASPAY_WEBHOOK_SECRET n'est pas configurée/);
    });

    it("doit retourner la clé lorsqu'elle est définie", () => {
      process.env.SASPAY_API_KEY = "sk_test_mock123";
      expect(getSaspayApiKey()).toBe("sk_test_mock123");
    });
  });

  describe("3. Vérification de signature Webhook (Anti-rejeu & HMAC SHA-256)", () => {
    const mockSecret = "whsec_test_secret_123456789";
    const rawBody = JSON.stringify({
      event: "transaction.success",
      data: {
        id: "9c3f2a10-4b7e-4f1a-9d2e-9b6a7c1e4a02",
        status: "SUCCESS",
        net_amount: "2500.00",
      },
    });

    function generateSignature(body: string, timestamp: number, secret: string) {
      return crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.${body}`)
        .digest("hex")
        .toLowerCase();
    }

    it("doit valider une signature authentique avec un horodatage récent", () => {
      const now = Math.floor(Date.now() / 1000);
      const signature = generateSignature(rawBody, now, mockSecret);

      const isValid = verifySaspayWebhookSignature(
        rawBody,
        signature,
        String(now),
        mockSecret
      );

      expect(isValid).toBe(true);
    });

    it("doit rejeter une signature forgée ou erronée", () => {
      const now = Math.floor(Date.now() / 1000);
      const fakeSignature = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

      const isValid = verifySaspayWebhookSignature(
        rawBody,
        fakeSignature,
        String(now),
        mockSecret
      );

      expect(isValid).toBe(false);
    });

    it("doit rejeter un horodatage s'écartant de plus de 300 secondes (Anti-rejeu)", () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 305; // 305 secondes plus tôt
      const signature = generateSignature(rawBody, pastTimestamp, mockSecret);

      const isValid = verifySaspayWebhookSignature(
        rawBody,
        signature,
        String(pastTimestamp),
        mockSecret
      );

      expect(isValid).toBe(false);
    });

    it("doit rejeter si les headers sont manquants", () => {
      expect(verifySaspayWebhookSignature(rawBody, null, "123456", mockSecret)).toBe(false);
      expect(verifySaspayWebhookSignature(rawBody, "sig", null, mockSecret)).toBe(false);
    });
  });

  describe("4. Gestion des Erreurs SasPay (SaspayApiError)", () => {
    it("doit correctement instancier les erreurs avec code HTTP", () => {
      const err401 = new SaspayApiError("Non autorisé", 401, "unauthorized");
      expect(err401.statusCode).toBe(401);
      expect(err401.code).toBe("unauthorized");

      const err403 = new SaspayApiError("IP non whitelistée", 403, "ip_not_whitelisted");
      expect(err403.statusCode).toBe(403);
      expect(err403.code).toBe("ip_not_whitelisted");

      const err422 = new SaspayApiError("Devise incompatible", 422, "currency_country_mismatch");
      expect(err422.statusCode).toBe(422);

      const err429 = new SaspayApiError("Trop de requêtes", 429, "rate_limit_exceeded");
      expect(err429.statusCode).toBe(429);
    });
  });
});
