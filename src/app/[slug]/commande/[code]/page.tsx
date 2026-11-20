import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Store, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatFCFA } from "@/lib/format";
import { buildWhatsAppOrderMessage, getWhatsAppOrderUrl } from "@/lib/whatsapp";
import { WhatsAppSendCard } from "./whatsapp-send-card";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";

type Props = {
  params: Promise<{ slug: string; code: string }>;
};

export const metadata: Metadata = { title: "Commande confirmée" };

export default async function OrderConfirmationPage({ params }: Props) {
  const { slug, code } = await params;
  const supabase = await createClient();

  // Récupérer la commande par son code public lisible
  const { data: order } = await supabase
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
      customer_note,
      created_at,
      shop:shops!inner(id, name, slug, whatsapp_number, primary_color),
      customer:customers!inner(name, phone),
      order_items(product_name, unit_price, quantity, selected_options)
    `
    )
    .eq("public_code", code)
    .maybeSingle();

  if (!order) notFound();

  const shop = order.shop as unknown as {
    name: string;
    slug: string;
    whatsapp_number: string;
    primary_color: string;
  };
  const customer = order.customer as unknown as { name: string; phone: string };
  const items = (order.order_items as unknown as Array<{
    product_name: string;
    unit_price: number;
    quantity: number;
    selected_options: string | null;
  }>) ?? [];

  const orderData = {
    shopName: shop.name,
    shopWhatsapp: shop.whatsapp_number,
    publicCode: order.public_code,
    customerName: customer.name,
    customerPhone: customer.phone,
    fulfillment: order.fulfillment,
    deliveryAddress: order.delivery_address,
    deliveryZoneName: order.delivery_zone_name,
    customerNote: order.customer_note,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    total: order.total,
    items: items.map((i) => ({
      productName: i.product_name,
      unitPrice: i.unit_price,
      quantity: i.quantity,
      selectedOptions: i.selected_options,
    })),
  };

  const whatsappUrl = getWhatsAppOrderUrl(orderData);
  const whatsappMessageText = buildWhatsAppOrderMessage(orderData);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-8 flex flex-col gap-6">
      {/* Badge succès & statut */}
      <div className="flex flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-3xl bg-success-50 text-success-600 mb-3 shadow-xs">
          <CheckCircle2 className="size-9" />
        </span>
        <h1 className="text-2xl font-black text-ink">Commande enregistrée !</h1>
        <p className="mt-1 text-xs text-muted">
          Code de suivi : <span className="font-mono font-bold text-ink">{order.public_code}</span>
        </p>
        <div className="mt-2.5">
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Carte d'envoi WhatsApp (cœur du produit) */}
      <WhatsAppSendCard
        whatsappUrl={whatsappUrl}
        messageText={whatsappMessageText}
        shopName={shop.name}
      />

      {/* Détails de la commande */}
      <div className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Détail des articles</h2>
        <div className="divide-y divide-line">
          {items.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
              <div className="min-w-0 pr-2">
                <p className="font-bold text-ink truncate">
                  {item.quantity}x {item.product_name}
                </p>
                {item.selected_options && (
                  <p className="text-[11px] text-muted italic truncate">{item.selected_options}</p>
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
            <span>Mode</span>
            <span>{order.fulfillment === "delivery" ? "Livraison à domicile" : "Retrait en magasin"}</span>
          </div>
          {order.fulfillment === "delivery" && order.delivery_fee > 0 && (
            <div className="flex justify-between text-muted">
              <span>
                Frais de livraison
                {order.delivery_zone_name ? ` (${order.delivery_zone_name})` : ""}
              </span>
              <span>{formatFCFA(order.delivery_fee)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-ink pt-2 border-t border-line">
            <span>Total</span>
            <span style={{ color: shop.primary_color }}>{formatFCFA(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <Link
          href={`/${shop.slug}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700 hover:underline"
        >
          <Store className="size-4" />
          <span>Retourner à la boutique {shop.name}</span>
        </Link>
      </div>
    </main>
  );
}
