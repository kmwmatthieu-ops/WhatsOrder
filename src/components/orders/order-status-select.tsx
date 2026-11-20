"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/app/tableau-de-bord/commandes/actions";
import { ORDER_STATUS_LABELS } from "./order-status-badge";
import { Spinner } from "@/components/ui/spinner";
import { Check } from "lucide-react";

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleChange(newStatus: string) {
    if (newStatus === status) return;
    setError("");
    setSuccess(false);

    startTransition(async () => {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res.error) {
        setError(res.error);
      } else {
        setStatus(newStatus);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="order-status-select" className="text-xs font-bold uppercase tracking-wider text-muted">
        Statut de la commande
      </label>
      <div className="flex items-center gap-2">
        <select
          id="order-status-select"
          disabled={isPending}
          value={status}
          onChange={(e) => handleChange(e.target.value)}
          className="h-11 flex-1 rounded-2xl border border-line bg-white px-3.5 text-sm font-bold text-ink outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100 disabled:opacity-60"
        >
          {Object.entries(ORDER_STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        {isPending && <Spinner className="size-5 text-brand-600 shrink-0" />}
        {success && <Check className="size-5 text-success-600 shrink-0" />}
      </div>
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  );
}
