export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "Nouvelle",
  confirmed: "Confirmée",
  ready: "Prête",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-brand-50 text-brand-700 border-brand-200",
  ready: "bg-amber-50 text-amber-700 border-amber-200",
  delivered: "bg-success-50 text-success-700 border-success-200",
  cancelled: "bg-danger-50 text-danger-700 border-danger-200",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status] ?? status;
  const style = ORDER_STATUS_STYLES[status] ?? "bg-sand text-ink border-line";

  return (
    <span className={`inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-bold ${style}`}>
      {label}
    </span>
  );
}
