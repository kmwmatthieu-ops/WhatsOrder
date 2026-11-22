import crypto from "crypto";
import {
  SaspayApiError,
  SaspayCheckoutSession,
  SaspayCheckoutSessionInput,
  SaspayCheckoutSessionStatusResponse,
  SaspayCountry,
  SaspayNetwork,
  SaspayPaymentVerifyResponse,
  SaspaySoftpayInput,
  SaspaySoftpayResponse,
} from "./types";

export { SaspayApiError } from "./types";

const SASPAY_BASE_URL = process.env.SASPAY_BASE_URL || "https://api.saspay.me/api/v1";

/**
 * Récupère et valide la clé API SasPay côté serveur.
 */
export function getSaspayApiKey(): string {
  const key = process.env.SASPAY_API_KEY;
  if (!key) {
    throw new SaspayApiError(
      "La variable d'environnement SASPAY_API_KEY n'est pas configurée.",
      401,
      "missing_api_key"
    );
  }
  return key;
}

/**
 * Récupère le secret de signature des webhooks.
 */
export function getSaspayWebhookSecret(): string {
  const secret = process.env.SASPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new SaspayApiError(
      "La variable d'environnement SASPAY_WEBHOOK_SECRET n'est pas configurée.",
      500,
      "missing_webhook_secret"
    );
  }
  return secret;
}

/**
 * Formate un montant en chaîne décimale stricte conforme à SasPay (ex: "2500.00").
 * Rejette strictement les montants négatifs ou invalides.
 */
export function formatSaspayAmount(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num) || num <= 0) {
    throw new Error(`Montant invalide pour SasPay : ${amount}`);
  }
  return num.toFixed(2);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  idempotencyKey?: string;
  apiKey?: string;
}

/**
 * Exécute une requête authentifiée vers l'API SasPay depuis le backend.
 */
async function saspayRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const apiKey = options.apiKey || getSaspayApiKey();
  const url = `${SASPAY_BASE_URL.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch (networkErr: unknown) {
    const msg = networkErr instanceof Error ? networkErr.message : "Erreur réseau";
    throw new SaspayApiError(`Impossible de joindre l'API SasPay : ${msg}`, 503, "network_error");
  }

  // Traitement spécifique selon le code HTTP
  if (!response.ok) {
    let errorData: { message?: string; error?: { message?: string; code?: string }; code?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignorer si la réponse n'est pas du JSON
    }

    const errorMessage =
      errorData.error?.message ||
      errorData.message ||
      `Erreur SasPay (${response.status} ${response.statusText})`;
    const errorCode = errorData.error?.code || errorData.code;

    switch (response.status) {
      case 401:
        throw new SaspayApiError(
          "Clé API SasPay invalide ou expirée.",
          401,
          errorCode || "unauthorized",
          errorData
        );
      case 403:
        throw new SaspayApiError(
          `Accès refusé par SasPay : ${errorMessage}`,
          403,
          errorCode || "forbidden",
          errorData
        );
      case 404:
        throw new SaspayApiError(
          `Ressource SasPay introuvable : ${errorMessage}`,
          404,
          errorCode || "not_found",
          errorData
        );
      case 409:
        throw new SaspayApiError(
          `Conflit d'idempotence ou état SasPay : ${errorMessage}`,
          409,
          errorCode || "conflict",
          errorData
        );
      case 422:
        throw new SaspayApiError(
          `Validation SasPay échouée : ${errorMessage}`,
          422,
          errorCode || "unprocessable_entity",
          errorData
        );
      case 429:
        throw new SaspayApiError(
          "Limite de requêtes SasPay atteinte (300 req/min). Veuillez espacer les appels.",
          429,
          "rate_limit_exceeded",
          errorData
        );
      default:
        throw new SaspayApiError(errorMessage, response.status, errorCode, errorData);
    }
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const json = (await response.json()) as Record<string, unknown>;
  if (json && typeof json === "object" && "data" in json && json.data !== undefined) {
    return json.data as T;
  }
  return json as unknown as T;
}

/**
 * 1. Créer une session de checkout hébergé (POST /checkout-sessions/)
 * Génère une page de paiement hébergée par SasPay (checkout_url).
 */
export async function createSaspayCheckoutSession(
  input: SaspayCheckoutSessionInput
): Promise<SaspayCheckoutSession> {
  const formattedInput: SaspayCheckoutSessionInput = {
    ...input,
    amount: formatSaspayAmount(input.amount),
  };

  return saspayRequest<SaspayCheckoutSession>("checkout-sessions/", {
    method: "POST",
    body: formattedInput,
  });
}

/**
 * 2. Vérifier le statut d'une session de checkout (GET /checkout-sessions/{id}/status/)
 */
export async function getSaspayCheckoutSessionStatus(
  sessionId: string
): Promise<SaspayCheckoutSessionStatusResponse> {
  return saspayRequest<SaspayCheckoutSessionStatusResponse>(
    `checkout-sessions/${encodeURIComponent(sessionId)}/status/`
  );
}

/**
 * 3. Softpay : paiement mobile money direct (POST /payments/softpay/)
 * Exige Idempotency-Key selon les spécifications.
 */
export async function createSaspaySoftpayPayment(
  input: SaspaySoftpayInput,
  idempotencyKey: string
): Promise<SaspaySoftpayResponse> {
  if (!idempotencyKey) {
    throw new Error("Une Idempotency-Key est obligatoire pour POST /payments/softpay/.");
  }

  const formattedInput: SaspaySoftpayInput = {
    ...input,
    amount: formatSaspayAmount(input.amount),
  };

  return saspayRequest<SaspaySoftpayResponse>("payments/softpay/", {
    method: "POST",
    body: formattedInput,
    idempotencyKey,
  });
}

/**
 * 4. Vérifier l'état réel d'un paiement (GET /payments/{payment_id}/verify/)
 * Source de vérité absolue : seul SUCCESS autorise la livraison.
 */
export async function verifySaspayPayment(
  paymentId: string
): Promise<SaspayPaymentVerifyResponse> {
  return saspayRequest<SaspayPaymentVerifyResponse>(
    `payments/${encodeURIComponent(paymentId)}/verify/`
  );
}

/**
 * 5. Rejouer un paiement échoué (POST /payments/{payment_id}/retry/)
 */
export async function retrySaspayPayment(
  paymentId: string,
  idempotencyKey: string
): Promise<SaspayPaymentVerifyResponse> {
  if (!idempotencyKey) {
    throw new Error("Une Idempotency-Key est obligatoire pour retry.");
  }

  return saspayRequest<SaspayPaymentVerifyResponse>(
    `payments/${encodeURIComponent(paymentId)}/retry/`,
    {
      method: "POST",
      idempotencyKey,
    }
  );
}

/**
 * 6. Lister les pays supportés (GET /countries/)
 */
export async function getSaspayCountries(): Promise<SaspayCountry[]> {
  return saspayRequest<SaspayCountry[]>("countries/");
}

/**
 * 7. Lister les réseaux mobile money supportés (GET /networks/)
 */
export async function getSaspayNetworks(page = 1, pageSize = 50): Promise<{
  count: number;
  results: SaspayNetwork[];
}> {
  return saspayRequest<{ count: number; results: SaspayNetwork[] }>(
    `networks/?page=${page}&page_size=${pageSize}`
  );
}

/**
 * 8. Vérification stricte de la signature des webhooks SasPay :
 * - Horodatage dans les 300 secondes (tolérance anti-rejeu)
 * - HMAC SHA-256 sur le corps brut : `${timestamp}.${rawBody}`
 * - Comparaison en temps constant (anti-timing attacks)
 */
export function verifySaspayWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null,
  timestampHeader: string | null,
  secretOverride?: string
): boolean {
  if (!signatureHeader || !timestampHeader) {
    return false;
  }

  const timestampNum = parseInt(timestampHeader, 10);
  if (isNaN(timestampNum)) {
    return false;
  }

  // 1. Rejeter si l'horodatage s'écarte de plus de 300 secondes de l'horloge serveur
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowInSeconds - timestampNum) > 300) {
    return false;
  }

  const secret = secretOverride || getSaspayWebhookSecret();
  const rawBodyBuffer = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
  const prefixBuffer = Buffer.from(`${timestampHeader}.`, "utf8");
  const payloadToSign = Buffer.concat([prefixBuffer, rawBodyBuffer]);

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadToSign)
    .digest("hex")
    .toLowerCase();

  const receivedSignature = signatureHeader.trim().toLowerCase();

  if (expectedSignature.length !== receivedSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(receivedSignature, "utf8")
    );
  } catch {
    return false;
  }
}
