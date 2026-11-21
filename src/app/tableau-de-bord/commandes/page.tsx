import type { Metadata } from "next";
import { requireShop } from "@/lib/supabase/server";
import { OrdersView } from "@/components/orders/orders-view";

export const metadata: Metadata = { title: "Commandes" };

export default async function OrdersPage() {
  const { shop, supabase } = await requireShop();

  // Récupérer toutes les commandes de la boutique avec les données client et paiement (V2-D)
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      id,
      public_code,
      status,
      fulfillment,
      delivery_address,
      delivery_zone_name,
      total,
      amount_paid,
      payment_status,
      payment_method,
      created_at,
      customer:customers(name, phone)
    `
    )
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });

  type RawOrder = {
    id: string;
    public_code: string;
    status: string;
    fulfillment: string;
    delivery_address: string | null;
    delivery_zone_name: string | null;
    total: number;
    amount_paid: number;
    payment_status: string;
    payment_method: string | null;
    created_at: string;
    customer: { name: string; phone: string } | null;
  };

  const formattedOrders = ((orders as unknown as RawOrder[]) ?? []).map((o) => ({
    id: o.id,
    public_code: o.public_code,
    status: o.status,
    fulfillment: o.fulfillment,
    delivery_address: o.delivery_address,
    delivery_zone_name: o.delivery_zone_name,
    total: o.total,
    amount_paid: o.amount_paid,
    payment_status: o.payment_status,
    payment_method: o.payment_method,
    created_at: o.created_at,
    customer: o.customer,
  }));

  return <OrdersView orders={formattedOrders} />;
}
