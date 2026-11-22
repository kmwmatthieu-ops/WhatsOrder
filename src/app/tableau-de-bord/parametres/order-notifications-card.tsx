"use client";

import { useState } from "react";
import Link from "next/link";
import { BellRing, Lock, Sparkles, Check, AlertCircle } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { toggleOrderEmailNotificationPref } from "./actions";

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

  async function handleToggle(checked: boolean) {
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

  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-7 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <BellRing className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">Notifications de commande</h2>
              {!hasOrderEmailNotifications && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                  <Lock className="size-2.5" />
                  <span>Business & Premium</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              Soyez notifié par e-mail dès qu&apos;un client passe une commande sur votre boutique.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <Toggle
            label="Recevoir un e-mail à chaque nouvelle commande"
            hideLabel
            checked={hasOrderEmailNotifications && enabled}
            onChange={handleToggle}
            disabled={!hasOrderEmailNotifications || loading}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!hasOrderEmailNotifications ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="font-bold text-amber-900">Fonctionnalité réservée aux forfaits supérieurs</p>
            <p className="text-muted leading-relaxed">
              Votre formule actuelle ({currentPlanName}) n&apos;inclut pas les alertes e-mail automatiques. Passez au forfait Business ou Premium pour ne manquer aucune vente.
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
        <p className="text-[11px] text-muted">
          {enabled
            ? "✓ Les notifications par e-mail sont activées pour votre boutique."
            : "Les notifications par e-mail sont désactivées. Vous pouvez les réactiver à tout moment."}
        </p>
      )}
    </section>
  );
}
