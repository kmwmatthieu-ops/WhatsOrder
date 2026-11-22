/**
 * Gestionnaire audio, notifications visuelles et badges Bon Waz à Dealer.
 * Supporte :
 * 1. Web Audio + HTML5 Audio fallback (sonnerie de caisse hors-ligne).
 * 2. W3C App Badging API (PWA sur écran d'accueil Android / Windows / macOS / iOS).
 * 3. Dynamic Canvas Favicon Badging (macaron rouge direct sur l'onglet du navigateur).
 * 4. Document Title Badging (ex. "(1) 🔔 Nouvelle commande !").
 * 5. Notifications système via ServiceWorker Registration (Android & Mobile) et Desktop.
 */

import { CHIME_BASE64_WAV } from "./chime-sound";

let originalFaviconHref: string | null = null;
let originalDocumentTitle: string | null = null;
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioContextClass();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Déverrouillage automatique des restrictions audio navigateur dès le premier toucher/clic utilisateur
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    } catch {}
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  };
  window.addEventListener("click", unlockAudio, { passive: true, once: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true, once: true });
}

/**
 * Déclenche une sonnerie de caisse / carillon cristallin (Mi6 - Sol#6 - Do7).
 * Utilise la Web Audio API avec fallback immédiat sur balise HTML5 Audio.
 */
export function playOrderChime(): boolean {
  if (typeof window === "undefined") return false;
  let played = false;

  // 1. Essai Web Audio oscillator
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // Note 1 : Mi6 (1318.5 Hz)
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

      // Note 2 : Sol#6 (1661.2 Hz)
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

      // Note 3 : Do7 cloche (2093.0 Hz)
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

      played = true;
    }
  } catch {
    played = false;
  }

  // 2. Fallback HTML5 Audio garanti (joue même en cas de blocage d'AudioContext)
  try {
    const audio = new Audio(CHIME_BASE64_WAV);
    audio.volume = 0.9;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }
    played = true;
  } catch {}

  return played;
}

/**
 * Dessine un badge rouge numérique dynamique directement sur le favicon de l'onglet navigateur.
 * Fonctionne sur TOUS les navigateurs (Chrome, Safari, Firefox, Edge) sur PC comme sur Mobile !
 */
function drawFaviconBadge(count: number) {
  if (typeof document === "undefined") return;

  try {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "shortcut icon";
      document.head.appendChild(link);
    }

    if (!originalFaviconHref) {
      originalFaviconHref = link.href;
    }

    if (count <= 0) {
      link.href = originalFaviconHref || "/icon-192.png";
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = originalFaviconHref || "/icon-192.png";

    img.onload = () => {
      ctx.drawImage(img, 0, 0, 32, 32);

      // Dessiner pastille rouge éclatante (façon WhatsApp)
      ctx.beginPath();
      ctx.arc(23, 9, 8, 0, 2 * Math.PI);
      ctx.fillStyle = "#E11D48";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#FFFFFF";
      ctx.stroke();

      // Texte du nombre
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(count > 9 ? "9+" : String(count), 23, 9);

      link!.href = canvas.toDataURL("image/png");
    };

    // Si l'image met du temps ou échoue à charger, dessiner au moins la pastille
    img.onerror = () => {
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, 2 * Math.PI);
      ctx.fillStyle = "#E11D48";
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(count), 16, 16);
      link!.href = canvas.toDataURL("image/png");
    };
  } catch {}
}

/**
 * Met à jour le badge rouge sur l'application :
 * - Sur l'icône de l'application PWA (Android / Windows / macOS / iOS) via App Badging API.
 * - Sur le favicon de l'onglet du navigateur (Canvas).
 * - Sur le titre du document HTML (ex. "(1) 🔔 Nouvelle commande !").
 */
export function updateAppBadge(count: number) {
  // 1. W3C App Badging API pour PWA installée sur écran d'accueil
  if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }

  if (typeof window === "undefined") return;

  // 2. Favicon dynamique avec pastille rouge
  drawFaviconBadge(count);

  // 3. Titre de la page avec indicateur
  if (typeof document !== "undefined") {
    if (!originalDocumentTitle) {
      originalDocumentTitle = document.title;
    }
    if (count > 0) {
      document.title = `(${count}) 🔔 Nouvelle commande ! - Bon Waz à Dealer`;
    } else if (originalDocumentTitle) {
      document.title = originalDocumentTitle;
    }
  }
}

/**
 * Efface le badge rouge sur l'icône de l'application, restaure le favicon et le titre.
 */
export function clearAppBadge() {
  // 1. W3C App Badging
  if (typeof navigator !== "undefined" && "clearAppBadge" in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }

  if (typeof window === "undefined") return;

  // 2. Favicon restauré
  drawFaviconBadge(0);

  // 3. Titre restauré
  if (typeof document !== "undefined" && originalDocumentTitle) {
    document.title = originalDocumentTitle;
  }
}

/**
 * Déclenche une vibration haptique sur téléphone.
 */
export function triggerHapticFeedback() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([250, 100, 250, 100, 250]);
    } catch {}
  }
}

/**
 * Envoie une notification système native compatible Mobile (Android via Service Worker) et Desktop (PC).
 * Évite le crash "Illegal constructor" de new Notification() sur Android.
 */
export async function sendSystemNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
  }
): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  const notifOptions: NotificationOptions = {
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // @ts-expect-error vibration support in NotificationOptions
    vibrate: [250, 100, 250, 100, 250],
    ...options,
  };

  // 1. Préférer le Service Worker (obligatoire et seul moyen fonctionnel sur Android Chrome & PWA)
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, notifOptions);
        return true;
      }
    } catch (err) {
      console.warn("SW showNotification non disponible, tentative directe:", err);
    }
  }

  // 2. Fallback direct pour les navigateurs PC (Windows, macOS)
  try {
    new Notification(title, notifOptions);
    return true;
  } catch (err) {
    console.warn("Notification directe bloquée ou non supportée:", err);
    return false;
  }
}
