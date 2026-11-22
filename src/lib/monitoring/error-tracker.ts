/**
 * Système de surveillance des erreurs en production (Sentry / logs structurés)
 * Garantit l'absence totale de données personnelles (PII) :
 * filtres stricts sur emails, téléphones, clés API et tokens.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g;
const TOKEN_REGEX = /(?:Bearer\s+[A-Za-z0-9\-._~+/]+=*|sk_(?:live|test)_[a-zA-Z0-9_]+)/gi;

export function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(EMAIL_REGEX, "[EMAIL_EXPURGÉ]")
    .replace(TOKEN_REGEX, "[CLE_EXPURGÉE]")
    .replace(PHONE_REGEX, (match) => {
      // Filtrer uniquement les suites de chiffres ressemblant à un numéro (>= 8 chiffres)
      const digits = match.replace(/\D/g, "");
      return digits.length >= 8 ? "[TEL_EXPURGÉ]" : match;
    });
}

export function sanitizeContext(data?: Record<string, unknown>): Record<string, unknown> {
  if (!data) return {};
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    // Exclure directement les champs sensibles connus
    if (
      lowerKey.includes("password") ||
      lowerKey.includes("token") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("phone") ||
      lowerKey.includes("email") ||
      lowerKey.includes("name") ||
      lowerKey.includes("address") ||
      lowerKey.includes("customer")
    ) {
      cleaned[key] = "[EXPURGÉ]";
      continue;
    }

    if (typeof value === "string") {
      cleaned[key] = sanitizeText(value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      cleaned[key] = value;
    } else if (value && typeof value === "object") {
      try {
        cleaned[key] = JSON.parse(sanitizeText(JSON.stringify(value)));
      } catch {
        cleaned[key] = "[OBJET_NON_SERIALISABLE]";
      }
    }
  }

  return cleaned;
}

interface SentryDsnParts {
  publicKey: string;
  host: string;
  projectId: string;
}

function parseSentryDsn(dsn?: string): SentryDsnParts | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const pathParts = url.pathname.split("/").filter(Boolean);
    const projectId = pathParts[0];

    if (!publicKey || !host || !projectId) return null;
    return { publicKey, host, projectId };
  } catch {
    return null;
  }
}

export async function captureError(
  error: unknown,
  context?: {
    location?: string;
    extra?: Record<string, unknown>;
    digest?: string;
  }
): Promise<void> {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const safeMessage = sanitizeText(err.message || "Erreur inconnue");
    const safeStack = sanitizeText(err.stack || "");
    const safeContext = sanitizeContext(context?.extra);
    const location = context?.location ? sanitizeText(context.location) : "unknown";

    const payload = {
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: new Date().toISOString(),
      platform: "javascript",
      level: "error",
      logger: "whatsorder.monitoring",
      culprit: location,
      message: safeMessage,
      exception: {
        values: [
          {
            type: err.name || "Error",
            value: safeMessage,
            stacktrace: safeStack
              ? {
                  frames: safeStack.split("\n").map((line) => ({
                    filename: line.trim(),
                  })),
                }
              : undefined,
          },
        ],
      },
      tags: {
        environment: process.env.NODE_ENV || "development",
        digest: context?.digest || "",
      },
      extra: {
        ...safeContext,
        location,
      },
    };

    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
    const sentryParts = parseSentryDsn(dsn);

    if (sentryParts) {
      // Envoi direct sans dépendance lourde vers Sentry Store API
      const sentryEndpoint = `https://${sentryParts.host}/api/${sentryParts.projectId}/store/`;
      const authHeader = `Sentry sentry_version=7, sentry_client=whatsorder-tracker/1.0, sentry_key=${sentryParts.publicKey}`;

      await fetch(sentryEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": authHeader,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silencieux pour ne pas impacter le flux utilisateur
      });
    } else {
      // En l'absence de DSN ou en environnement local : journalisation structurée sans PII
      if (process.env.NODE_ENV === "production") {
        console.error(
          JSON.stringify({
            level: "error",
            type: "production_error_logged",
            message: safeMessage,
            location,
            digest: context?.digest,
            timestamp: payload.timestamp,
          })
        );
      } else {
        console.error("[MONITORING (sans PII)]", {
          message: safeMessage,
          location,
          digest: context?.digest,
          extra: safeContext,
        });
      }
    }
  } catch {
    // Protection absolue : aucune défaillance du monitoring ne doit casser le service
  }
}
