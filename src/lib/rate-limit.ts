/**
 * Limiteur de fréquence en mémoire (Sliding Window Rate Limiter).
 * Protège le formulaire de commande contre le spam et les attaques par déni de service.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Nettoyage régulier des anciens enregistrements pour éviter les fuites mémoire
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const threshold = now - windowMs;
  for (const [key, record] of store.entries()) {
    const valid = record.timestamps.filter((t) => t > threshold);
    if (valid.length === 0) {
      store.delete(key);
    } else {
      record.timestamps = valid;
    }
  }
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetMs: number;
};

/**
 * Vérifie si une clé a dépassé la limite autorisée.
 * @param key Identifiant (ex: 'ip:1.2.3.4' ou 'phone:+2250700000000')
 * @param limit Nombre maximal de requêtes autorisées
 * @param windowMs Fenêtre de temps en millisecondes
 */
export function checkRateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 10 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  cleanup(windowMs);

  const threshold = now - windowMs;
  let record = store.get(key);

  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filtrer les timestamps hors fenêtre
  record.timestamps = record.timestamps.filter((t) => t > threshold);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, oldest + windowMs - now);
    return {
      success: false,
      remaining: 0,
      resetMs,
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    remaining: limit - record.timestamps.length,
    resetMs: windowMs,
  };
}

/** Réinitialise le store (utilisé principalement pour les tests unitaires). */
export function resetRateLimits() {
  store.clear();
}
