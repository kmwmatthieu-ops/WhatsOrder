"use client";

import { useState, useTransition } from "react";
import { Sparkles, BadgeCheck, Check, AlertCircle } from "lucide-react";
import { updateSubscriptionPlanAction } from "./actions";
import { Spinner } from "@/components/ui/spinner";
import type { SubscriptionPlan } from "@/types/database";

export function AdminPlansManagement({ initialPlans }: { initialPlans: SubscriptionPlan[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ id: string; success: boolean; text: string } | null>(null);
  const [, startTransition] = useTransition();

  function handleFieldChange(
    planId: string,
    field: keyof SubscriptionPlan,
    value: string | number | boolean | null
  ) {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, [field]: value } : p))
    );
  }

  function handleSave(plan: SubscriptionPlan) {
    setSavingId(plan.id);
    setStatusMessage(null);

    startTransition(async () => {
      const res = await updateSubscriptionPlanAction(
        plan.id,
        Number(plan.visibility_multiplier ?? 1.0),
        Boolean(plan.has_certified_badge),
        plan.price_monthly,
        plan.max_products,
        plan.max_orders_per_month,
        plan.max_explorer_products !== undefined ? plan.max_explorer_products : null
      );

      setSavingId(null);
      if (res.ok) {
        setStatusMessage({
          id: plan.id,
          success: true,
          text: `Paramètres du forfait ${plan.name} enregistrés avec succès !`,
        });
      } else {
        setStatusMessage({
          id: plan.id,
          success: false,
          text: res.error || "Erreur lors de l'enregistrement.",
        });
      }
    });
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-xs space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand-600" />
          <h2 className="text-base font-bold text-ink">
            Paramètres des Forfaits & Visibilité Explorer
          </h2>
        </div>
        <p className="text-xs text-muted mt-1">
          Modifiez les coefficients de visibilité de l&apos;algorithme Explorer et le droit au badge
          de certification officiel sans toucher au code.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isSaving = savingId === plan.id;
          const msg = statusMessage?.id === plan.id ? statusMessage : null;

          return (
            <div
              key={plan.id}
              className={`flex flex-col justify-between rounded-2xl border p-4.5 gap-4 transition-all ${
                plan.id === "premium"
                  ? "border-purple-200 bg-purple-50/20"
                  : plan.id === "business"
                    ? "border-blue-200 bg-blue-50/20"
                    : "border-line bg-sand/30"
              }`}
            >
              <div className="space-y-3.5">
                {/* En-tête Forfait */}
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider ${
                      plan.id === "premium"
                        ? "bg-purple-600 text-white"
                        : plan.id === "business"
                          ? "bg-blue-600 text-white"
                          : "bg-ink text-white"
                    }`}
                  >
                    {plan.name}
                  </span>
                  <span className="text-xs font-bold text-muted">
                    {plan.price_monthly === 0 ? "Gratuit" : `${plan.price_monthly.toLocaleString("fr-FR")} FCFA/m`}
                  </span>
                </div>

                {/* Coefficient de visibilité */}
                <div className="space-y-1">
                  <label
                    htmlFor={`multiplier-${plan.id}`}
                    className="block text-xs font-bold text-ink"
                  >
                    Coefficient de visibilité Explorer
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`multiplier-${plan.id}`}
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="10.0"
                      value={plan.visibility_multiplier ?? 1.0}
                      onChange={(e) =>
                        handleFieldChange(
                          plan.id,
                          "visibility_multiplier",
                          parseFloat(e.target.value) || 1.0
                        )
                      }
                      className="h-9 w-24 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink outline-none focus:border-brand-600"
                    />
                    <span className="text-xs font-extrabold text-brand-700">
                      ×{Number(plan.visibility_multiplier ?? 1.0).toFixed(1)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    {plan.id === "gratuit"
                      ? "Valeur de base (1.0 = visibilité normale)."
                      : `Multiplie le score de fraîcheur par ${Number(plan.visibility_multiplier ?? 1.0).toFixed(1)}.`}
                  </p>
                </div>

                {/* Quota de produits affichés simultanément dans Explorer */}
                <div className="space-y-1.5 pt-2 border-t border-line/60">
                  <label
                    htmlFor={`max-explorer-${plan.id}`}
                    className="block text-xs font-bold text-ink"
                  >
                    Quota de produits dans Explorer
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`max-explorer-${plan.id}`}
                      type="number"
                      min="1"
                      max="100"
                      placeholder="Illimité"
                      value={plan.max_explorer_products ?? ""}
                      onChange={(e) =>
                        handleFieldChange(
                          plan.id,
                          "max_explorer_products",
                          e.target.value === "" ? null : parseInt(e.target.value, 10)
                        )
                      }
                      className="h-9 w-24 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink outline-none focus:border-brand-600"
                    />
                    <span className="text-xs font-semibold text-muted">
                      {plan.max_explorer_products ? "produits max" : "Illimité"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    {plan.max_explorer_products
                      ? `Limite le nombre de produits de ce commerçant visibles simultanément sur Explorer à ${plan.max_explorer_products}.`
                      : "Tous les produits du commerçant sont éligibles dans Explorer sans restriction de quota."}
                  </p>
                </div>

                {/* Droit au badge de certification */}
                <div className="pt-2 border-t border-line/60">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(plan.has_certified_badge)}
                      onChange={(e) =>
                        handleFieldChange(plan.id, "has_certified_badge", e.target.checked)
                      }
                      className="mt-0.5 size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="flex items-center gap-1 font-bold text-ink">
                        <span>Droit au badge vérifié</span>
                        <BadgeCheck className="size-3.5 fill-blue-600 text-white shrink-0" />
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">
                        Si coché, la boutique affiche la coche bleue dès que son identité est
                        validée et son abonnement actif.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Feedback & Bouton Enregistrer */}
              <div className="pt-3 border-t border-line/60 flex flex-col gap-2">
                {msg && (
                  <div
                    className={`flex items-center gap-1.5 text-[11px] font-semibold rounded-lg p-2 ${
                      msg.success
                        ? "bg-success-50 text-success-700 border border-success-200"
                        : "bg-danger-50 text-danger-700 border border-danger-200"
                    }`}
                  >
                    {msg.success ? (
                      <Check className="size-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="size-3.5 shrink-0" />
                    )}
                    <span>{msg.text}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave(plan)}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-ink px-3 text-xs font-bold text-white hover:bg-black transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? (
                    <Spinner className="size-3.5 text-white" />
                  ) : (
                    <span>Enregistrer</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
