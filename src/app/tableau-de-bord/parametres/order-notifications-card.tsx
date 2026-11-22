"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  Lock,
  Sparkles,
  AlertCircle,
  Volume2,
  Smartphone,
  CheckCircle2,
  Bell,
  Play,
  RotateCcw,
  Mail,
} from "lucide-react";
import { FEATURES } from "@/config/features";
import { Toggle } from "@/components/ui/toggle";
import { toggleOrderEmailNotificationPref } from "./actions";
import {
  playOrderChime,
  updateAppBadge,
  clearAppBadge,
  triggerHapticFeedback,
  sendSystemNotification,
} from "@/lib/sound";

interface OrderNotificationsCardProps {
  initialEnabled: boolean;
  hasOrderEmailNotifications: boolean;
  currentPlanName: string;
}

export function OrderNotificationsCard({
  initialEnabled,
  hasOrderEmailNotifications,
  currentPlanName,
}: OrderNotificationsCardProps) {
  const showAudioVisual = FEATURES.ENABLE_ORDER_AUDIO_AND_VISUAL_ALERTS;
  const showWebPush = FEATURES.ENABLE_WEB_PUSH_NOTIFICATIONS;
  const showPlatformAlerts = showAudioVisual || showWebPush;

  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Statut des permissions navigateur
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [chimePlaying, setChimePlaying] = useState(false);
  const [badgeTested, setBadgeTested] = useState(false);

  useEffect(() => {
    if (showWebPush && typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [showWebPush]);

  async function handleToggleEmail(checked: boolean) {
    if (!hasOrderEmailNotifications || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await toggleOrderEmailNotificationPref(checked);
      if (res.error) {
        setError(res.error);
      } else {
        setEnabled(checked);
      }
    } catch {
      setError("Impossible d'enregistrer la préférence. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestPermission() {
    if (typeof window === "undefined") return;

    if (showAudioVisual) {
      // 1. Tester le carillon et le retour haptique
      playOrderChime();
      triggerHapticFeedback();
      updateAppBadge(1);
      setBadgeTested(true);
    }

    // 2. Solliciter ou tester la notification système native
    if (showWebPush && "Notification" in window) {
      try {
        let perm = Notification.permission;
        if (perm !== "granted") {
          perm = await Notification.requestPermission();
          setNotificationPermission(perm);
        }

        if (perm === "granted") {
          await sendSystemNotification("Alerte commande activée ! 🔔", {
            body: "Votre appareil est prêt : vous recevrez une alerte sonore et visuelle à chaque commande.",
            tag: "test-notification",
          });
        }
      } catch (err) {
        console.warn("Erreur notification système:", err);
      }
    }

    if (showAudioVisual) {
      setTimeout(() => {
        clearAppBadge();
        setBadgeTested(false);
      }, 6000);
    }
  }

  function handleTestChime() {
    if (!showAudioVisual) return;
    setChimePlaying(true);
    playOrderChime();
    triggerHapticFeedback();
    setTimeout(() => setChimePlaying(false), 1200);
  }

  function handleTestBadge() {
    if (!showAudioVisual) return;
    setBadgeTested(true);
    updateAppBadge(1);
    playOrderChime();
    triggerHapticFeedback();
    if (showWebPush) {
      sendSystemNotification("Test d'alerte Bon Waz à Dealer 🔔", {
        body: "Pastille rouge active sur votre icône d'application et l'onglet de votre navigateur !",
      });
    }
    setTimeout(() => {
      clearAppBadge();
      setBadgeTested(false);
    }, 6000);
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-7 shadow-xs space-y-6">
      {/* En-tête de section */}
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 shrink-0">
          {showPlatformAlerts ? <BellRing className="size-6" /> : <Mail className="size-6" />}
        </span>
        <div>
          <h2 className="text-base sm:text-lg font-black text-ink">
            {showPlatformAlerts ? "Alertes & Notifications de commande" : "Notifications de commande par e-mail"}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {showPlatformAlerts
              ? "Ne manquez aucune vente : la plateforme vous prévient instantanément dès qu'un client passe commande."
              : "Recevez un récapitulatif par e-mail dès qu'un client passe commande sur votre boutique."}
          </p>
        </div>
      </div>

      {/* Bloc 1 : Notifications Directes de la Plateforme (Application Web, Mobile & PC) */}
      {showPlatformAlerts && (
        <div className="rounded-2xl border border-line bg-sand/30 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-brand-600" />
            <h3 className="text-sm font-black text-ink">Alertes instantanées de l&apos;application</h3>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[10px] font-bold text-emerald-700">
              Automatique
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Lorsque vous avez l&apos;application ouverte ou installée sur votre téléphone/ordinateur (format Web App / PWA), un signal sonore retentit et un badge rouge s&apos;affiche sur l&apos;icône, comme sur WhatsApp.
          </p>

          {badgeTested && showAudioVisual && (
            <div className="rounded-2xl border-2 border-brand-500 bg-brand-50/90 p-4 text-xs text-brand-900 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="relative flex size-3.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-3.5 bg-danger-600"></span>
                </span>
                <div>
                  <p className="font-extrabold text-ink text-xs sm:text-sm">🔴 Badge rouge actif (1)</p>
                  <p className="text-[11px] text-muted">
                    Observez l&apos;icône de votre application ou le favicon rouge en haut de votre onglet navigateur !
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-brand-700 bg-white border border-brand-200 px-2 py-1 rounded-lg shrink-0">
                Actif (6s)
              </span>
            </div>
          )}

          {/* Options de test interactives */}
          {showAudioVisual && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Test Sonnerie */}
              <div className="rounded-xl border border-line bg-white p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-sand text-brand-700">
                    <Volume2 className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink">Sonnerie de caisse</p>
                    <p className="text-[10px] text-muted">Carillon distinctif</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestChime}
                  disabled={chimePlaying}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  <Play className={`size-3 ${chimePlaying ? "animate-spin" : ""}`} />
                  <span>{chimePlaying ? "En cours…" : "Tester"}</span>
                </button>
              </div>

              {/* Test Badge icône (style WhatsApp) */}
              <div className="rounded-xl border border-line bg-white p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="relative grid size-8 place-items-center rounded-lg bg-sand text-brand-700">
                    <Bell className="size-4" />
                    <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-danger-600 text-[8px] font-black text-white">
                      1
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink">Badge rouge d&apos;icône</p>
                    <p className="text-[10px] text-muted">Sur écran d&apos;accueil PWA</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestBadge}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sand hover:bg-sand/80 text-ink px-3 py-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95"
                  title="Affiche temporairement un badge 1 sur l'icône de l'application installée"
                >
                  <span>{badgeTested ? "Affiché (1) ✓" : "Tester le badge"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Autorisation et test des notifications système */}
          {showWebPush && (
            <div className="pt-3 border-t border-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                {notificationPermission === "granted" ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    <span>Notifications système autorisées</span>
                  </span>
                ) : notificationPermission === "denied" ? (
                  <span className="inline-flex items-center gap-1.5 text-danger-700 font-semibold bg-danger-50 border border-danger-200 px-3 py-1.5 rounded-xl">
                    <AlertCircle className="size-4 shrink-0 text-danger-600" />
                    <span>Bloquées par les paramètres du navigateur</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-brand-800 font-semibold bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl">
                    <Bell className="size-4 text-brand-600 shrink-0" />
                    <span>Autorisation recommandée</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleRequestPermission}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-700 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <Bell className="size-4" />
                <span>
                  {notificationPermission === "granted"
                    ? "Tester la notification système"
                    : "Activer les notifications système"}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bloc 2 : Notifications par E-mail */}
      <div className={showPlatformAlerts ? "pt-2 border-t border-line/60" : ""}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink">Récapitulatif par e-mail</h3>
              {!hasOrderEmailNotifications && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                  <Lock className="size-2.5" />
                  <span>Business & Premium</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              Recevez également un e-mail détaillé dès qu&apos;un client passe une commande sur votre boutique.
            </p>
          </div>

          <div className="shrink-0">
            <Toggle
              label="Recevoir un e-mail à chaque nouvelle commande"
              hideLabel
              checked={hasOrderEmailNotifications && enabled}
              onChange={handleToggleEmail}
              disabled={!hasOrderEmailNotifications || loading}
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!hasOrderEmailNotifications ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-bold text-amber-900">E-mails réservés aux forfaits Business et Premium</p>
              <p className="text-muted leading-relaxed">
                {showPlatformAlerts
                  ? `Votre formule actuelle (${currentPlanName}) inclut les alertes sonores et badges de l'application. Pour recevoir en plus les alertes par e-mail, passez à la formule supérieure.`
                  : `Votre formule actuelle (${currentPlanName}) n'inclut pas les notifications par e-mail. Pour recevoir un e-mail à chaque commande, passez à la formule supérieure.`}
              </p>
            </div>
            <Link
              href="/tableau-de-bord/abonnement"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 transition-colors shrink-0"
            >
              <Sparkles className="size-3.5" />
              <span>Passer à Business</span>
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-muted">
            {enabled
              ? "✓ L'envoi automatique d'un e-mail à chaque commande est actif."
              : showPlatformAlerts
              ? "L'envoi par e-mail est désactivé. Les alertes sonores et visuelles de l'application restent actives."
              : "L'envoi par e-mail est désactivé."}
          </p>
        )}
      </div>
    </section>
  );
}
