import Link from "next/link";
import { formatFCFA } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { ShoppingBag, ChevronRight, MessageCircle } from "lucide-react";

export type CustomerRowData = {
  id: string;
  name: string;
  phone: string;
  orders_count: number;
  total_spent: number;
  created_at: string;
};

export function CustomerRow({ customer }: { customer: CustomerRowData }) {
  const cleanPhone = customer.phone.replace(/\D/g, "");
  const waUrl = `https://wa.me/${cleanPhone}`;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-xs hover:border-brand-500 transition-colors">
      <Link href={`/tableau-de-bord/clients/${customer.id}`} className="min-w-0 flex-1 pr-3">
        <p className="font-bold text-sm text-ink truncate">{customer.name}</p>
        <p className="text-xs text-muted mt-0.5">{formatPhone(customer.phone)}</p>
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-lg bg-sand/70 px-2 py-0.5 font-semibold text-ink">
            <ShoppingBag className="size-3 text-brand-600" />
            {customer.orders_count} commande{customer.orders_count > 1 ? "s" : ""}
          </span>
          <span className="font-extrabold text-brand-700">{formatFCFA(customer.total_spent)}</span>
        </div>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="grid size-9 place-items-center rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
          title="Discuter sur WhatsApp"
        >
          <MessageCircle className="size-4.5" />
        </a>
        <Link href={`/tableau-de-bord/clients/${customer.id}`} className="p-1 text-muted hover:text-ink">
          <ChevronRight className="size-5" />
        </Link>
      </div>
    </div>
  );
}
