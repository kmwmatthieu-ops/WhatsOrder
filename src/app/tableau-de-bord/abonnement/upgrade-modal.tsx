"use client";

import { useState } from "react";
import { Sparkles, X, Check, Smartphone, MessageCircle, AlertCircle, ArrowRight } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { MOBILE_MONEY_PAYMENT_CONFIG } from "@/lib/constants";
import type { SubscriptionPlan, Shop } from "@/types/database";
import { requestSubscriptionUpgrade, type UpgradeActionState } from "./actions";

type UpgradeModalProps = {
  shop: Shop;
  plans: SubscriptionPlan[];
  currentPlanId: string;
  isExpired?: boolean;
};

export function UpgradeModal({ shop, plans, currentPlanId, isExpired }: UpgradeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const paidPlans = plans.filter((p) => p.id !== "gratuit");

  const [selectedPlanId, setSelectedPlanId] = useState<"business" | "premium">(
    currentPlanId === "premium" ? "premium" : "business"
  );
  const [duration, setDuration] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<string>("wave");
  const [senderPhone, setSenderPhone] = useState(shop.whatsapp_number || "");
  const [txRef, setTxRef] = useState("");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<UpgradeActionState | null>(null);

  const selectedPlan = paidPlans.find((p) => p.id === selectedPlanId) || paidPlans[0];
  const totalAmount = selectedPlan ? selectedPlan.price_monthly * duration : 0;
  const currentProvider = MOBILE_MONEY_PAYMENT_CONFIG.accounts.find((a) => a.provider === paymentMethod) || MOBILE_MONEY_PAYMENT_CONFIG.accounts[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    setPending(true);
    setState(null);

    const formData = new FormData();
    formData.append("requested_plan_id", selectedPlanId);
    formData.append("duration_months", String(duration));
    formData.append("payment_method", paymentMethod);
    formData.append("sender_phone", senderPhone);
    if (txRef.trim()) {
      formData.append("transaction_reference", txRef.trim());
    }

    const res = await requestSubscriptionUpgrade({}, formData);
    setState(res);
    setPending(false);
  }

  function getWhatsAppSupportLink() {
    const text = encodeURIComponent(
      `Bonjour Support Bon Waz à Dealer !\nJe viens d'initier le paiement de mon abonnement :\n- Boutique : ${shop.name}\n- Plan : ${selectedPlan?.name}\n- Durée : ${duration} mois\n- Montant : ${formatFCFA(totalAmount)}\n- Paiement : ${currentProvider.label}\n- Numéro émetteur : ${senderPhone}\n${txRef ? `- Référence : ${txRef}` : ""}\nMerci de valider mon abonnement.`
    );
    return `https://wa.me/${MOBILE_MONEY_PAYMENT_CONFIG.supportWhatsapp}?text=${text}`;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setState(null);
        }}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-700 active:scale-98 transition-all"
      >
        <Sparkles className="size-4" />
        <span>{isExpired ? "Renouveler mon abonnement" : "Changer ou prolonger mon plan"}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl my-8">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-muted hover:bg-sand hover:text-ink transition-colors"
            >
              <X className="size-4" />
            </button>

            {state?.ok ? (
              <div className="flex flex-col items-center text-center py-4">
                <span className="grid size-14 place-items-center rounded-full bg-success-50 text-success-600 mb-3">
                  <Check className="size-7 stroke-[3]" />
                </span>
                <h3 className="text-lg font-black text-ink">Demande enregistrée !</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
                  Votre demande pour le plan <strong>{selectedPlan?.name}</strong> ({duration} mois — {formatFCFA(totalAmount)}) a bien été transmise à notre équipe.
                </p>

                <div className="my-5 w-full rounded-2xl border border-line bg-sand/30 p-4 text-left text-xs">
                  <p className="font-bold text-ink mb-1">Dernière étape pour validation rapide :</p>
                  <p className="text-muted leading-relaxed">
                    Envoyez la capture ou le message de confirmation Mobile Money au support WhatsApp pour que votre compte soit activé en quelques minutes.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <a
                    href={getWhatsAppSupportLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#20ba59] transition-all"
                  >
                    <MessageCircle className="size-4" />
                    <span>Notifier sur WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-2xl border border-line px-5 py-3 text-xs font-bold text-ink hover:bg-sand transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h3 className="text-lg font-black text-ink">Passer à la formule supérieure</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Paiement direct par Mobile Money sans carte bancaire.
                  </p>
                </div>

                {state?.error && (
                  <div className="flex items-center gap-2 rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{state.error}</span>
                  </div>
                )}

                {/* 1. Choix du plan */}
                <div>
                  <label className="text-xs font-bold text-ink block mb-2">1. Choisissez votre formule</label>
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
                          </span>
                        </button>
                      );
                    })}
                  </div>
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

                {/* 3. Moyen de paiement & Instructions */}
                <div>
                  <label className="text-xs font-bold text-ink block mb-2">3. Moyen de paiement Mobile Money</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {MOBILE_MONEY_PAYMENT_CONFIG.accounts.map((acc) => (
                      <button
                        key={acc.provider}
                        type="button"
                        onClick={() => setPaymentMethod(acc.provider)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border truncate transition-colors ${
                          paymentMethod === acc.provider
                            ? "border-brand-600 bg-brand-50 text-brand-700"
                            : "border-line bg-white text-ink hover:bg-sand"
                        }`}
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-3.5 text-xs">
                    <p className="font-bold text-brand-800">Numéro de transfert officiel ({currentProvider.label}) :</p>
                    <p className="text-sm font-black text-ink mt-0.5 tracking-wider">{currentProvider.number}</p>
                    <p className="text-muted text-[11px] mt-0.5">Bénéficiaire : {currentProvider.recipient}</p>
                    <div className="mt-2 pt-2 border-t border-brand-200/60 flex items-center justify-between font-bold">
                      <span className="text-brand-900">Total à transférer :</span>
                      <span className="text-base text-brand-700 font-black">{formatFCFA(totalAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Coordonnées de transaction */}
                <div className="space-y-3">
                  <div>
                    <label htmlFor="sender-phone" className="text-xs font-bold text-ink block mb-1">
                      Votre numéro émetteur (ayant envoyé l&apos;argent) *
                    </label>
                    <input
                      id="sender-phone"
                      type="tel"
                      required
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="+225 07 00 00 00 00"
                      className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-ink focus:border-brand-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="tx-ref" className="text-xs font-bold text-ink block mb-1">
                      Référence de transaction SMS (optionnel)
                    </label>
                    <input
                      id="tx-ref"
                      type="text"
                      value={txRef}
                      onChange={(e) => setTxRef(e.target.value)}
                      placeholder="Ex: TX-984214 ou code SMS"
                      className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-ink focus:border-brand-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={pending || !senderPhone.trim()}
                    className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-600 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <span>{pending ? "Enregistrement…" : `Confirmer ma demande (${formatFCFA(totalAmount)})`}</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
