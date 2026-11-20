import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  Truck,
  Store as StoreIcon,
  Clock,
  User,
  MapPin,
  FileText,
} from "lucide-react";
import { requireShop } from "@/lib/supabase/server";
import { formatFCFA } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { OrderStatusBadge, ORDER_STATUS_LABELS } from "@/components/orders/order-status-badge";
import { OrderStatusSelect } from "@/components/orders/order-status-select";
import { OrderPaymentForm } from "@/components/orders/order-payment-form";
import { OrderShareButton } from "@/components/orders/order-share-button";
import { buildWhatsAppOrderMessage } from "@/lib/whatsapp";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: "Détail de la commande" };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const { shop, supabase } = await requireShop();

  // Récupérer la commande complète
  const [{ data: order }, { data: items }, { data: history }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `
        id,
        public_code,
        status,
        fulfillment,
        delivery_address,
        delivery_fee,
        delivery_zone_name,
        subtotal,
        total,
        payment_status,
        payment_method,
        amount_paid,
        customer_note,
        created_at,
        customer:customers(id, name, phone, address)
      `
      )
      .eq("id", id)
      .eq("shop_id", shop.id)
      .maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("changed_at", { ascending: false }),
  ]);

  if (!order) notFound();

  type CustomerInfo = { id: string; name: string; phone: string; address: string | null };
  const customer = order.customer as unknown as CustomerInfo | null;

  const cleanCustomerPhone = customer?.phone ? customer.phone.replace(/\D/g, "") : "";
  const waMessageForCustomer = `Bonjour ${customer?.name ?? ""}, c'est ${shop.name} concernant votre commande ${order.public_code} (${formatFCFA(order.total)}).`;
  const waContactUrl = `https://wa.me/${cleanCustomerPhone}?text=${encodeURIComponent(waMessageForCustomer)}`;

  const summaryText = buildWhatsAppOrderMessage({
    shopName: shop.name,
    shopWhatsapp: shop.whatsapp_number,
    publicCode: order.public_code,
    customerName: customer?.name ?? "Client",
    customerPhone: customer?.phone ?? "",
    fulfillment: order.fulfillment,
    deliveryAddress: order.delivery_address,
    customerNote: order.customer_note,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    total: order.total,
    items: (items ?? []).map((i) => ({
      productName: i.product_name,
      unitPrice: i.unit_price,
      quantity: i.quantity,
      selectedOptions: i.selected_options,
    })),
  });

  const orderDate = new Date(order.created_at).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête de retour */}
      <div className="flex items-center justify-between">
        <Link
          href="/tableau-de-bord/commandes"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Toutes les commandes
        </Link>
        <OrderShareButton summaryText={summaryText} />
      </div>

      {/* Titre & Statut */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-3xl border border-line bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink">{order.public_code}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-xs text-muted mt-1 capitalize">{orderDate}</p>
        </div>

        {customer?.phone && (
          <a
            href={waContactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#20ba59] transition-colors"
          >
            <MessageCircle className="size-4" />
            <span>Contacter le client sur WhatsApp</span>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Client & Coordonnées */}
        <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <User className="size-4 text-brand-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Coordonnées du client</h2>
          </div>

          <div>
            <p className="font-extrabold text-base text-ink">{customer?.name ?? "Client anonyme"}</p>
            {customer?.phone && (
              <p className="text-xs font-semibold text-muted mt-0.5">{formatPhone(customer.phone)}</p>
            )}
          </div>

          <div className="border-t border-line pt-3 flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2 text-muted">
              {order.fulfillment === "delivery" ? (
                <>
                  <Truck className="size-4 text-brand-600 shrink-0" />
                  <span className="font-semibold text-ink">Livraison à domicile</span>
                </>
              ) : (
                <>
                  <StoreIcon className="size-4 text-brand-600 shrink-0" />
                  <span className="font-semibold text-ink">Retrait en magasin</span>
                </>
              )}
            </div>

            {order.fulfillment === "delivery" && order.delivery_zone_name && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-muted">Zone :</span>
                <span className="font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                  {order.delivery_zone_name}
                </span>
              </div>
            )}

            {order.fulfillment === "delivery" && order.delivery_address && (
              <div className="flex items-start gap-2 text-muted">
                <MapPin className="size-4 text-brand-600 shrink-0 mt-0.5" />
                <span className="text-ink">{order.delivery_address}</span>
              </div>
            )}

            {order.customer_note && (
              <div className="flex items-start gap-2 bg-sand/60 p-2.5 rounded-xl text-ink">
                <FileText className="size-4 text-muted shrink-0 mt-0.5" />
                <span className="italic">{order.customer_note}</span>
              </div>
            )}
          </div>
        </section>

        {/* 2. Changement de Statut & Historique */}
        <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-4">
          <OrderStatusSelect orderId={order.id} currentStatus={order.status} />

          <div className="border-t border-line pt-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted mb-2">
              <Clock className="size-3.5" />
              <span>Historique des étapes</span>
            </div>

            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
              {(history ?? []).map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs py-1 border-b border-line/60 last:border-none">
                  <span className="font-semibold text-ink">
                    {ORDER_STATUS_LABELS[h.status] ?? h.status}
                  </span>
                  <span className="text-muted text-[11px]">
                    {new Date(h.changed_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* 3. Articles & Tarifs */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Articles commandés</h2>

        <div className="divide-y divide-line">
          {(items ?? []).map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
              <div className="min-w-0 pr-2">
                <p className="font-bold text-ink">
                  {item.quantity}x {item.product_name}
                </p>
                {item.selected_options && (
                  <p className="text-[11px] text-muted italic">{item.selected_options}</p>
                )}
              </div>
              <span className="font-extrabold text-ink shrink-0">
                {formatFCFA(item.unit_price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-line pt-3 flex flex-col gap-1.5 text-xs sm:text-sm">
          <div className="flex justify-between text-muted">
            <span>Sous-total</span>
            <span>{formatFCFA(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Frais de livraison</span>
            <span>{order.delivery_fee > 0 ? formatFCFA(order.delivery_fee) : "Gratuit"}</span>
          </div>
          <div className="flex justify-between text-base font-extrabold text-ink pt-2 border-t border-line">
            <span>Total</span>
            <span className="text-brand-700">{formatFCFA(order.total)}</span>
          </div>
        </div>
      </section>

      {/* 4. Enregistrement du Paiement */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Gestion du règlement</h2>
        <OrderPaymentForm
          orderId={order.id}
          total={order.total}
          initialStatus={order.payment_status}
          initialMethod={order.payment_method}
          initialAmountPaid={order.amount_paid}
        />
      </section>
    </div>
  );
}
