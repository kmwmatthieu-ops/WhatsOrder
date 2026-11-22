"use client";

import { useActionState, useEffect } from "react";
import { AlertTriangle, X, CheckCircle2 } from "lucide-react";
import { submitReportAction, type ReportState } from "@/app/explorer/actions";
import { Button } from "@/components/ui/button";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "product" | "shop";
  targetName: string;
  shopId: string;
  productId?: string;
}

const REASONS = [
  { value: "produit_interdit", label: "Produit interdit ou illicite" },
  { value: "contrefacon", label: "Contrefaçon ou atteinte aux droits" },
  { value: "arnaque", label: "Arnaque ou escroquerie potentielle" },
  { value: "inapproprie", label: "Contenu inapproprié ou offensant" },
  { value: "autre", label: "Autre motif" },
];

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetName,
  shopId,
  productId,
}: ReportModalProps) {
  const [state, formAction, isPending] = useActionState<ReportState, FormData>(
    submitReportAction,
    {}
  );

  useEffect(() => {
    if (state.ok) {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state.ok, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-2xl bg-danger-50 text-danger-600">
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">
                Signaler {targetType === "product" ? "un produit" : "une boutique"}
              </h2>
              <p className="text-[11px] text-muted truncate max-w-[240px]">
                {targetName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl text-muted hover:bg-sand hover:text-ink transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {state.ok ? (
          <div className="py-8 text-center flex flex-col items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-success-50 text-success-600">
              <CheckCircle2 className="size-6" />
            </span>
            <p className="text-sm font-bold text-ink">Signalement enregistré</p>
            <p className="text-xs text-muted max-w-xs leading-relaxed">
              {state.message}
            </p>
          </div>
        ) : (
          <form action={formAction} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="target_type" value={targetType} />
            <input type="hidden" name="shop_id" value={shopId} />
            {productId && <input type="hidden" name="product_id" value={productId} />}

            {state.error && (
              <div className="rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
                {state.error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-ink">
                Motif du signalement <span className="text-danger-500">*</span>
              </label>
              <div className="flex flex-col gap-1.5">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className="flex items-center gap-2.5 rounded-xl border border-line p-2.5 text-xs text-ink hover:bg-sand/60 cursor-pointer transition-colors has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50/40"
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      required
                      className="size-3.5 accent-brand-600"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-ink">
                Précisions supplémentaires <span className="text-muted font-normal">(optionnel)</span>
              </label>
              <textarea
                name="details"
                rows={3}
                maxLength={1000}
                placeholder="Décrivez brièvement le problème constaté..."
                className="w-full rounded-2xl border border-line p-3 text-xs text-ink placeholder:text-muted focus:border-brand-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="h-10 rounded-2xl border border-line bg-white px-4 text-xs font-semibold text-ink hover:bg-sand transition-colors"
              >
                Annuler
              </button>
              <Button type="submit" size="sm" loading={isPending}>
                Envoyer le signalement
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
