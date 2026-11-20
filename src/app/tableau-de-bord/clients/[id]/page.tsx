import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, ShoppingBag, CreditCard, Calendar } from "lucide-react";
import { requireShop } from "@/lib/supabase/server";
import { formatFCFA } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { OrderRow } from "@/components/orders/order-row";
import { CustomerNotesCard } from "@/components/customers/customer-notes-card";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: "Fiche client" };

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const { shop, supabase } = await requireShop();

  const [{ data: customer }, { data: orders }] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("shop_id", shop.id)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("*")
      .eq("customer_id", id)
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!customer) notFound();

  const ordersList = orders ?? [];
  const validOrders = ordersList.filter((o) => o.status !== "cancelled");
  const totalSpent = validOrders.reduce((acc, o) => acc + o.total, 0);
  const averageCart = validOrders.length > 0 ? Math.round(totalSpent / validOrders.length) : 0;

  const cleanPhone = customer.phone.replace(/\D/g, "");
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Bonjour ${customer.name}, c'est ${shop.name} !`
  )}`;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/tableau-de-bord/clients"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
      >
        <ArrowLeft className="size-4" />
        Tous les clients
      </Link>

      {/* Carte identité client */}
      <div className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ink">{customer.name}</h1>
          <p className="text-sm font-bold text-muted mt-0.5">{formatPhone(customer.phone)}</p>
          {customer.address && (
            <p className="text-xs text-muted mt-1">Adresse habituelle : {customer.address}</p>
          )}
        </div>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#20ba59] transition-colors"
        >
          <MessageCircle className="size-4" />
          <span>Contacter sur WhatsApp</span>
        </a>
      </div>

      {/* Statistiques du client */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-line bg-white p-3.5 shadow-xs text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Commandes</p>
          <p className="text-lg sm:text-xl font-black text-ink mt-1">{ordersList.length}</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-3.5 shadow-xs text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Total dépensé</p>
          <p className="text-base sm:text-xl font-black text-brand-700 mt-1">{formatFCFA(totalSpent)}</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-3.5 shadow-xs text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Panier moyen</p>
          <p className="text-base sm:text-xl font-black text-ink mt-1">{formatFCFA(averageCart)}</p>
        </div>
      </div>

      {/* Notes internes privées */}
      <CustomerNotesCard customerId={customer.id} initialNotes={customer.notes} />

      {/* Historique des commandes du client */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-ink">Historique des commandes ({ordersList.length})</h2>

        {ordersList.length === 0 ? (
          <p className="text-sm text-muted py-4">Aucune commande pour le moment.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {ordersList.map((order) => (
              <OrderRow
                key={order.id}
                order={{
                  id: order.id,
                  public_code: order.public_code,
                  status: order.status,
                  fulfillment: order.fulfillment,
                  total: order.total,
                  created_at: order.created_at,
                  customer: { name: customer.name, phone: customer.phone },
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
