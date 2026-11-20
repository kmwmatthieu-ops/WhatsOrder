import type { Metadata } from "next";
import { requireShop } from "@/lib/supabase/server";
import { CustomersView } from "@/components/customers/customers-view";

export const metadata: Metadata = { title: "Clients" };

export default async function CustomersPage() {
  const { shop, supabase } = await requireShop();

  // Récupérer les clients et agréger leurs commandes
  const [{ data: customers }, { data: orders }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, created_at")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("customer_id, total, status")
      .eq("shop_id", shop.id),
  ]);

  // Agrégation locale : nombre de commandes et total dépensé (hors commandes annulées)
  const statsByCustomer: Record<string, { count: number; totalSpent: number }> = {};

  for (const o of orders ?? []) {
    if (!statsByCustomer[o.customer_id]) {
      statsByCustomer[o.customer_id] = { count: 0, totalSpent: 0 };
    }
    statsByCustomer[o.customer_id].count += 1;
    if (o.status !== "cancelled") {
      statsByCustomer[o.customer_id].totalSpent += o.total;
    }
  }

  const formattedCustomers = (customers ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    orders_count: statsByCustomer[c.id]?.count ?? 0,
    total_spent: statsByCustomer[c.id]?.totalSpent ?? 0,
    created_at: c.created_at,
  }));

  return <CustomersView customers={formattedCustomers} />;
}
