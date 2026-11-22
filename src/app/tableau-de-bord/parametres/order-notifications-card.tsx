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
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { toggleOrderEmailNotificationPref } from "./actions";
import { playOrderChime, updateAppBadge, clearAppBadge, triggerHapticFeedback } from "@/lib/sound";

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
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Statut des permissions navigateur
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [chimePlaying, setChimePlaying] = useState(false);
  const [badgeTested, setBadgeTested] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

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
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === "granted") {
          new Notification("Notifications activées ! 🔔", {
            body: "Vous serez prévenu immédiatement lors de chaque nouvelle commande.",
            icon: "/icon-192.png",
          });
        }
      } catch {}
    }
  }

  function handleTestChime() {
    setChimePlaying(true);
    playOrderChime();
    triggerHapticFeedback();
    setTimeout(() => setChimePlaying(false), 1200);
  }

  function handleTestBadge() {
    setBadgeTested(true);
    updateAppBadge(1);
    setTimeout(() => {
      clearAppBadge();
      setBadgeTested(false);
    }, 4500);
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-7 shadow-xs space-y-6">
      {/* En-tête de section */}
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 shrink-0">
          <BellRing className="size-6" />
        </span>
        <div>
          <h2 className="text-base sm:text-lg font-black text-ink">Alertes & Notifications de commande</h2>
          <p className="text-xs text-muted mt-0.5">
            Ne manquez aucune vente : la plateforme vous prévient instantanément dès qu&apos;un client passe commande.
          </p>
        </div>
      </div>

      {/* Bloc 1 : Notifications Directes de la Plateforme (Application Web, Mobile & PC) */}
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

        {/* Options de test interactives */}
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

        {/* Autorisation des notifications système */}
        <div className="pt-2 border-t border-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-xs">
            {notificationPermission === "granted" ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="size-3.5" />
                <span>Notifications système autorisées sur cet appareil.</span>
              </span>
            ) : notificationPermission === "denied" ? (
              <span className="text-danger-600 font-medium">
                ⚠️ Notifications bloquées par les paramètres de votre navigateur.
              </span>
            ) : (
              <span className="text-muted">
                Autorisez les notifications système pour être alerté même l&apos;écran en veille.
              </span>
            )}
          </div>

          {notificationPermission !== "granted" && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-700 transition-colors shrink-0 cursor-pointer"
            >
              <Bell className="size-3.5" />
              <span>Activer les notifications système</span>
            </button>
          )}
        </div>
      </div>

      {/* Bloc 2 : Notifications par E-mail */}
      <div className="pt-2 border-t border-line/60">
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
                Votre formule actuelle ({currentPlanName}) inclut les alertes sonores et badges de l&apos;application. Pour recevoir en plus les alertes par e-mail, passez à la formule supérieure.
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
              : "L'envoi par e-mail est désactivé. Les alertes sonores et visuelles de l'application restent actives."}
          </p>
        )}
      </div>
    </section>
  );
}
