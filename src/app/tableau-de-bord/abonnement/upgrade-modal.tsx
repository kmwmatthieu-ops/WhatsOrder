"use client";

import { useState } from "react";
import { Sparkles, X, AlertCircle, ArrowRight, ShieldCheck, Smartphone } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import type { SubscriptionPlan, Shop } from "@/types/database";
import { initiateSaspaySubscriptionCheckout } from "./saspay-actions";

type UpgradeModalProps = {
  shop: Shop;
  plans: SubscriptionPlan[];
  currentPlanId: string;
  isExpired?: boolean;
};

export function UpgradeModal({ shop, plans, currentPlanId, isExpired }: UpgradeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const paidPlans = plans.filter((p) => p.id !== "gratuit");
  const isPremiumUser = currentPlanId === "premium";

  const [selectedPlanId, setSelectedPlanId] = useState<"business" | "premium">(
    isPremiumUser ? "premium" : "business"
  );
  const [duration, setDuration] = useState<number>(1);

  // Pour paiement en ligne SasPay
  const [onlinePending, setOnlinePending] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const selectedPlan = paidPlans.find((p) => p.id === selectedPlanId) || paidPlans[0];
  const totalAmount = selectedPlan ? selectedPlan.price_monthly * duration : 0;

  const buttonLabel = isExpired
    ? "Renouveler mon abonnement"
    : isPremiumUser
    ? "Prolonger mon abonnement"
    : "Changer ou prolonger mon plan";

  // Paiement en ligne immédiat via SasPay
  async function handleOnlineSaspayPay() {
    if (onlinePending) return;
    setOnlinePending(true);
    setOnlineError(null);

    try {
      const res = await initiateSaspaySubscriptionCheckout(selectedPlanId, duration);
      if (res.ok && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setOnlineError(res.error || "Impossible d'initialiser le paiement sécurisé.");
    } catch {
      setOnlineError("Une erreur est survenue lors de la connexion à SasPay.");
    } finally {
      setOnlinePending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setOnlineError(null);
        }}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-700 active:scale-98 transition-all"
      >
        <Sparkles className="size-4" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-muted hover:bg-sand hover:text-ink transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-black text-ink">
                  {isPremiumUser
                    ? "Prolonger mon abonnement Premium"
                    : "Mettre à niveau mon abonnement"}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {isPremiumUser
                    ? "Conservez vos avantages illimités, votre support VIP et votre présence Explorer."
                    : "Activation instantanée et sécurisée par Mobile Money (Afrique)."}
                </p>
              </div>

              {/* 1. Choix du plan (verrouillé sur Premium si déjà Premium) */}
              <div>
                <label className="text-xs font-bold text-ink block mb-2">
                  {isPremiumUser ? "1. Formule en cours de prolongation" : "1. Choisissez votre formule"}
                </label>
                {isPremiumUser ? (
                  <div className="rounded-2xl border-2 border-purple-500 bg-purple-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-sm text-purple-900">Formule Premium</span>
                        <p className="text-xs text-purple-700 mt-0.5">Produits et commandes illimités</p>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-600 text-white">
                        Illimité
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-bold text-purple-900">
                      {formatFCFA(selectedPlan?.price_monthly || 12000)} / mois
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {paidPlans.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id as "business" | "premium")}
                          className={`flex flex-col p-3.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-600/30"
                              : "border-line bg-white hover:bg-sand/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-sm text-ink">{plan.name}</span>
                            {plan.badge && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand-600 text-white">
                                {plan.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-brand-700 mt-1">
                            {formatFCFA(plan.price_monthly)} / mois
                          </span>
                          <span className="text-[11px] text-muted mt-1">
                            {plan.max_products ? `${plan.max_products} produits` : "Produits illimités"}
                            {" · "}
                            {plan.max_explorer_products ? `${plan.max_explorer_products} sur Explorer` : "Explorer illimité"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Durée */}
              <div>
                <label className="text-xs font-bold text-ink block mb-2">2. Durée d&apos;abonnement</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDuration(m)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        duration === m
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-line bg-white text-ink hover:bg-sand"
                      }`}
                    >
                      {m} mois
                    </button>
                  ))}
                </div>
              </div>

              {/* Détails du paiement sécurisé */}
              <div className="space-y-4">
                {onlineError && (
                  <div className="flex items-center gap-2 rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{onlineError}</span>
                  </div>
                )}

                <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 text-brand-800 font-bold">
                    <ShieldCheck className="size-4 text-brand-600" />
                    <span>Paiement sécurisé par SasPay</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink text-xs font-medium">
                    <Smartphone className="size-3.5 text-brand-600 shrink-0" />
                    <span>Moyen accepté : <strong>Mobile Money (Afrique)</strong> & Carte Bancaire</span>
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    Votre abonnement est activé automatiquement dès confirmation par votre opérateur Mobile Money.
                  </p>
                  <div className="mt-2 pt-2 border-t border-brand-200/60 flex items-center justify-between font-bold">
                    <span className="text-brand-900">Montant total :</span>
                    <span className="text-lg text-brand-700 font-black">{formatFCFA(totalAmount)}</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleOnlineSaspayPay}
                    disabled={onlinePending}
                    className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-600 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <span>{onlinePending ? "Redirection vers SasPay…" : `Payer par Mobile Money (${formatFCFA(totalAmount)})`}</span>
                    <ArrowRight className="size-4" />
                  </button>
                  <p className="text-[10px] text-center text-muted mt-2">
                    Redirection sécurisée vers la page de paiement officielle SasPay.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
