"use client";

import { useState, useTransition, type SyntheticEvent } from "react";
import { updateOrderPayment } from "@/app/tableau-de-bord/commandes/actions";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import { CreditCard, Check } from "lucide-react";

export function OrderPaymentForm({
  orderId,
  total,
  initialStatus,
  initialMethod,
  initialAmountPaid,
}: {
  orderId: string;
  total: number;
  initialStatus: string;
  initialMethod: string | null;
  initialAmountPaid: number;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [method, setMethod] = useState(initialMethod ?? "cash");
  const [amountPaid, setAmountPaid] = useState(initialAmountPaid);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleSave(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    startTransition(async () => {
      const res = await updateOrderPayment(orderId, status, method, amountPaid);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    });
  }

  function handleStatusQuickSelect(newStatus: "unpaid" | "partial" | "paid") {
    setStatus(newStatus);
    if (newStatus === "paid") setAmountPaid(total);
    if (newStatus === "unpaid") setAmountPaid(0);
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      {/* Sélecteur rapide statut de paiement */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => handleStatusQuickSelect("unpaid")}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all border ${
            status === "unpaid"
              ? "bg-danger-50 text-danger-700 border-danger-200 shadow-xs"
              : "bg-white text-muted border-line hover:bg-sand"
          }`}
        >
          Non payé
        </button>
        <button
          type="button"
          onClick={() => handleStatusQuickSelect("partial")}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all border ${
            status === "partial"
              ? "bg-amber-50 text-amber-700 border-amber-200 shadow-xs"
              : "bg-white text-muted border-line hover:bg-sand"
          }`}
        >
          Partiel
        </button>
        <button
          type="button"
          onClick={() => handleStatusQuickSelect("paid")}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all border ${
            status === "paid"
              ? "bg-success-50 text-success-700 border-success-200 shadow-xs"
              : "bg-white text-muted border-line hover:bg-sand"
          }`}
        >
          Payé intégral
        </button>
      </div>

      {/* Mode de paiement */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="payment-method-select" className="text-xs font-semibold text-ink">
          Mode de règlement
        </label>
        <select
          id="payment-method-select"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-11 rounded-2xl border border-line bg-white px-3.5 text-sm text-ink outline-none focus:border-brand-600"
        >
          <option value="cash">Espèces en main propre</option>
          <option value="cash_on_delivery">Paiement à la livraison</option>
          <option value="mobile_money">Mobile Money (Wave, Orange, MTN, Moov…)</option>
        </select>
      </div>

      {/* Montant encaissé */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="amount-paid-input" className="text-xs font-semibold text-ink">
          Montant reçu (FCFA)
        </label>
        <input
          id="amount-paid-input"
          type="number"
          min={0}
          value={amountPaid}
          onChange={(e) => setAmountPaid(Number(e.target.value))}
          className="h-11 rounded-2xl border border-line bg-white px-3.5 text-sm font-bold text-ink outline-none focus:border-brand-600"
        />
        <div className="flex justify-between text-xs text-muted pt-1">
          <span>Total commande : {formatFCFA(total)}</span>
          {amountPaid < total ? (
            <span className="text-danger-600 font-semibold">
              Reste : {formatFCFA(total - amountPaid)}
            </span>
          ) : (
            <span className="text-success-600 font-semibold">Totalement réglé</span>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-danger-600">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" size="sm" loading={isPending} className="flex-1">
          {success ? (
            <>
              <Check className="size-4 text-white" />
              Paiement enregistré !
            </>
          ) : (
            <>
              <CreditCard className="size-4" />
              Enregistrer le paiement
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
