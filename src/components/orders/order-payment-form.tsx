"use client";

import { useState, useTransition, type SyntheticEvent } from "react";
import { addOrderPayment, deleteOrderPayment } from "@/app/tableau-de-bord/commandes/actions";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import { CreditCard, Check, Plus, Trash2, Calendar, Receipt } from "lucide-react";
import type { OrderPayment, PaymentMethod } from "@/types/database";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  cash_on_delivery: "À la livraison",
  mobile_money: "Mobile Money",
};

export function OrderPaymentForm({
  orderId,
  total,
  initialPayments = [],
}: {
  orderId: string;
  total: number;
  initialPayments?: OrderPayment[];
}) {
  const [payments, setPayments] = useState<OrderPayment[]>(initialPayments);
  const [method, setMethod] = useState<PaymentMethod>("cash");

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const computedStatus: "unpaid" | "partial" | "paid" =
    totalPaid <= 0 ? "unpaid" : totalPaid < total ? "partial" : "paid";
  const progressPercent = total > 0 ? Math.min(100, Math.round((totalPaid / total) * 100)) : 100;

  const [amountInput, setAmountInput] = useState<string>(() =>
    remaining > 0 ? String(remaining) : ""
  );
  const [noteInput, setNoteInput] = useState<string>("");
  const [dateInput, setDateInput] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleAddPayment(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const numericAmount = Math.round(Number(amountInput));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Saisissez un montant valide supérieur à 0 FCFA.");
      return;
    }

    setError("");
    setSuccess(false);
    const idempotencyKey = `${orderId}-${Date.now()}-${numericAmount}`;

    startTransition(async () => {
      const res = await addOrderPayment({
        orderId,
        amount: numericAmount,
        method,
        note: noteInput,
        paidAt: dateInput ? new Date(dateInput).toISOString() : null,
        idempotencyKey,
      });

      if (res.error) {
        setError(res.error);
      } else if (res.payment) {
        const nextPayments = [res.payment, ...payments];
        setPayments(nextPayments);
        const nextPaid = nextPayments.reduce((acc, p) => acc + p.amount, 0);
        const nextRem = Math.max(0, total - nextPaid);
        setAmountInput(nextRem > 0 ? String(nextRem) : "");
        setNoteInput("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      }
    });
  }

  function handleRemovePayment(paymentId: string) {
    if (!confirm("Supprimer ce versement de l'historique ?")) return;
    setError("");

    startTransition(async () => {
      const res = await deleteOrderPayment(orderId, paymentId);
      if (res.error) {
        setError(res.error);
      } else {
        const nextPayments = payments.filter((p) => p.id !== paymentId);
        setPayments(nextPayments);
        const nextPaid = nextPayments.reduce((acc, p) => acc + p.amount, 0);
        const nextRem = Math.max(0, total - nextPaid);
        setAmountInput(nextRem > 0 ? String(nextRem) : "");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Synthèse automatique du règlement & Barre de progression */}
      <div className="rounded-2xl border border-line bg-sand/30 p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted">Statut calculé :</span>
            {computedStatus === "paid" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-50 border border-success-200 px-2.5 py-0.5 text-xs font-extrabold text-success-700">
                <Check className="size-3.5" /> Payée intégralement
              </span>
            ) : computedStatus === "partial" ? (
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                Paiement partiel ({progressPercent}%)
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-danger-50 border border-danger-200 px-2.5 py-0.5 text-xs font-extrabold text-danger-700">
                Non payée
              </span>
            )}
          </div>

          <span className="text-xs font-semibold text-muted">
            Total commande : <strong className="text-ink">{formatFCFA(total)}</strong>
          </span>
        </div>

        {/* Barre de progression */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-line/70">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              computedStatus === "paid"
                ? "bg-success-600"
                : computedStatus === "partial"
                  ? "bg-amber-500"
                  : "bg-danger-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
          <div className="rounded-xl bg-white border border-line p-2.5">
            <span className="text-[11px] text-muted block">Total encaissé</span>
            <span className="text-sm font-black text-success-700">{formatFCFA(totalPaid)}</span>
          </div>
          <div className="rounded-xl bg-white border border-line p-2.5">
            <span className="text-[11px] text-muted block">Solde restant à payer</span>
            <span
              className={`text-sm font-black ${
                remaining > 0 ? "text-danger-600" : "text-success-700"
              }`}
            >
              {remaining > 0 ? formatFCFA(remaining) : "0 FCFA (Soldé)"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Formulaire d'ajout d'un versement (partiel ou solde) */}
      <form onSubmit={handleAddPayment} className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5">
            <Plus className="size-4 text-brand-600" />
            <span>Enregistrer un versement</span>
          </h3>
          {remaining > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAmountInput(String(Math.max(1, Math.round(remaining / 2))))}
                className="rounded-lg border border-line bg-sand/50 px-2 py-0.5 text-[11px] font-bold text-ink hover:bg-sand"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setAmountInput(String(remaining))}
                className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700 hover:bg-brand-100"
              >
                Tout solder ({formatFCFA(remaining)})
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Montant */}
          <div>
            <label htmlFor="payment-amount" className="text-[11px] font-bold text-muted block mb-1">
              Montant reçu (FCFA)
            </label>
            <input
              id="payment-amount"
              type="number"
              min={1}
              step={50}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder={remaining > 0 ? String(remaining) : "Ex: 5000"}
              required
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-xs sm:text-sm font-bold text-ink outline-none focus:border-brand-600"
            />
          </div>

          {/* Mode */}
          <div>
            <label htmlFor="payment-method" className="text-[11px] font-bold text-muted block mb-1">
              Mode de paiement
            </label>
            <select
              id="payment-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink outline-none focus:border-brand-600"
            >
              <option value="cash">Espèces</option>
              <option value="cash_on_delivery">À la livraison</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="payment-date" className="text-[11px] font-bold text-muted block mb-1">
              Date du versement
            </label>
            <input
              id="payment-date"
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink outline-none focus:border-brand-600"
            />
          </div>
        </div>

        <div>
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            maxLength={200}
            placeholder="Note ou référence (facultatif, ex: Acompte Airtel Money / Wave…)"
            className="h-9 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink outline-none focus:border-brand-600"
          />
        </div>

        {error && <p className="text-xs text-danger-600 font-semibold">{error}</p>}

        <Button type="submit" size="sm" loading={isPending}>
          {success ? (
            <>
              <Check className="size-4 text-white" />
              <span>Versement ajouté !</span>
            </>
          ) : (
            <>
              <CreditCard className="size-4" />
              <span>Ajouter ce paiement</span>
            </>
          )}
        </Button>
      </form>

      {/* 3. Historique détaillé des transactions */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
          <Receipt className="size-3.5 text-brand-600" />
          <span>Historique des transactions ({payments.length})</span>
        </div>

        {payments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-sand/20 p-4 text-center text-xs text-muted">
            Aucun paiement enregistré sur cette commande pour le moment.
          </p>
        ) : (
          <div className="divide-y divide-line rounded-2xl border border-line bg-white overflow-hidden">
            {payments.map((p) => {
              const formattedDate = new Date(p.paid_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs hover:bg-sand/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-success-700">
                        +{formatFCFA(p.amount)}
                      </span>
                      <span className="rounded-lg bg-sand px-2 py-0.5 text-[11px] font-bold text-ink">
                        {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                        <Calendar className="size-3" />
                        <span suppressHydrationWarning>{formattedDate}</span>
                      </span>
                    </div>
                    {p.note && (
                      <p className="mt-0.5 text-[11px] text-muted italic truncate">{p.note}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemovePayment(p.id)}
                    className="grid size-8 shrink-0 place-items-center rounded-xl text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors disabled:opacity-40"
                    title="Supprimer ce versement"
                    aria-label="Supprimer ce versement"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
