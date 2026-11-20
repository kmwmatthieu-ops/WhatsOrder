import type { Metadata } from "next";
import { requireShop } from "@/lib/supabase/server";
import { OrdersView } from "@/components/orders/orders-view";

export const metadata: Metadata = { title: "Commandes" };

export default async function OrdersPage() {
  const { shop, supabase } = await requireShop();

  // Récupérer toutes les commandes de la boutique avec les données client associées
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      id,
      public_code,
      status,
      fulfillment,
      total,
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
    total: number;
    created_at: string;
    customer: { name: string; phone: string } | null;
  };

  const formattedOrders = ((orders as unknown as RawOrder[]) ?? []).map((o) => ({
    id: o.id,
    public_code: o.public_code,
    status: o.status,
    fulfillment: o.fulfillment,
    total: o.total,
    created_at: o.created_at,
    customer: o.customer,
  }));

  return <OrdersView orders={formattedOrders} />;
}
