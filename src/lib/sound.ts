/**
 * Gestionnaire audio et notifications visuelles Bon Waz à Dealer.
 * Génère des sonneries harmonieuses de caisse / carillon via Web Audio API (100% hors-ligne)
 * et pilote le badge d'application (App Badging API) pour les Web Apps mobiles et PC.
 */

/**
 * Déclenche une sonnerie de caisse / carillon distinctif pour signaler une nouvelle commande.
 * Synthétisé en temps réel sans nécessiter de téléchargement de fichier MP3.
 */
export function playOrderChime(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return false;

    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Première note cristalline (Mi6 = 1318.5 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1318.51, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // 2. Deuxième note carillon (Sol#6 = 1661.2 Hz)
    const t2 = now + 0.12;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1661.22, t2);
    gain2.gain.setValueAtTime(0.4, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.45);

    // 3. Cloche résonnante aiguë (Do7 = 2093.0 Hz) pour un rendu éclatant et reconnaissable
    const t3 = now + 0.25;
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "triangle";
    osc3.frequency.setValueAtTime(2093.0, t3);
    gain3.gain.setValueAtTime(0.3, t3);
    gain3.gain.exponentialRampToValueAtTime(0.001, t3 + 0.7);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(t3);
    osc3.stop(t3 + 0.7);

    return true;
  } catch {
    return false;
  }
}

/**
 * Met à jour le badge numérique rouge sur l'icône de l'application PWA (Android / Windows / macOS / iOS).
 * Similaire au macaron rouge WhatsApp indiquant le nombre de notifications accumulées.
 */
export function updateAppBadge(count: number) {
  if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }
}

/**
 * Efface le macaron / badge rouge sur l'icône de l'application.
 */
export function clearAppBadge() {
  if (typeof navigator !== "undefined" && "clearAppBadge" in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }
}

/**
 * Fait vibrer le téléphone lors d'une nouvelle commande si l'appareil le supporte.
 */
export function triggerHapticFeedback() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([250, 100, 250, 100, 250]);
    } catch {}
  }
}
