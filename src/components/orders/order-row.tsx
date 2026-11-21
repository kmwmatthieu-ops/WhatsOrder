import Link from "next/link";
import { formatFCFA } from "@/lib/format";
import { OrderStatusBadge } from "./order-status-badge";
import { Truck, Store as StoreIcon, ChevronRight } from "lucide-react";

export type OrderRowData = {
  id: string;
  public_code: string;
  status: string;
  fulfillment: string;
  delivery_address?: string | null;
  delivery_zone_name?: string | null;
  total: number;
  amount_paid?: number;
  payment_status?: string;
  payment_method?: string | null;
  created_at: string;
  customer?: {
    name: string;
    phone: string;
  } | null;
  items_count?: number;
};

export function OrderRow({ order }: { order: OrderRowData }) {
  const dateFormatted = new Date(order.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isPaid = order.payment_status === "paid";
  const isPartial = order.payment_status === "partial";

  return (
    <Link
      href={`/tableau-de-bord/commandes/${order.id}`}
      className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-xs hover:border-brand-500 transition-colors"
    >
      <div className="flex flex-col gap-1 min-w-0 pr-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono font-bold text-sm text-ink">{order.public_code}</span>
          <OrderStatusBadge status={order.status} />
          {isPaid ? (
            <span className="rounded-lg bg-success-50 px-1.5 py-0.5 text-[10px] font-bold text-success-700">
              Payée
            </span>
          ) : isPartial ? (
            <span className="rounded-lg bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
              Partiel ({formatFCFA(order.amount_paid ?? 0)})
            </span>
          ) : null}
        </div>

        <p className="truncate text-xs font-semibold text-ink">
          {order.customer?.name ?? "Client anonyme"}
        </p>

        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span suppressHydrationWarning>{dateFormatted}</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            {order.fulfillment === "delivery" ? (
              <>
                <Truck className="size-3 text-brand-600" />
                <span>Livraison</span>
              </>
            ) : (
              <>
                <StoreIcon className="size-3 text-brand-600" />
                <span>Retrait</span>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="font-extrabold text-sm sm:text-base text-ink">
          {formatFCFA(order.total)}
        </span>
        <ChevronRight className="size-4 text-muted" />
      </div>
    </Link>
  );
}
