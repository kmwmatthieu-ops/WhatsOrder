import Link from "next/link";
import { formatFCFA } from "@/lib/format";
import { OrderStatusBadge } from "./order-status-badge";
import { Truck, Store as StoreIcon, ChevronRight } from "lucide-react";

export type OrderRowData = {
  id: string;
  public_code: string;
  status: string;
  fulfillment: string;
  total: number;
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

  return (
    <Link
      href={`/tableau-de-bord/commandes/${order.id}`}
      className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-xs hover:border-brand-500 transition-colors"
    >
      <div className="flex flex-col gap-1 min-w-0 pr-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-ink">{order.public_code}</span>
          <OrderStatusBadge status={order.status} />
        </div>

        <p className="truncate text-xs font-semibold text-ink">
          {order.customer?.name ?? "Client anonyme"}
        </p>

        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>{dateFormatted}</span>
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
