import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Package,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { requireShop } from "@/lib/supabase/server";
import { shopUrl } from "@/lib/constants";
import { ShareShopButton } from "@/components/shop/share-shop-button";
import { OrderRow } from "@/components/orders/order-row";
import {
  AnalyticsPanel,
  type AnalyticsOrder,
  type AnalyticsOrderItem,
} from "@/components/dashboard/analytics-panel";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardHomePage() {
  const { shop, supabase } = await requireShop();

  // Requêtes parallèles pour les statistiques V2-D et les dernières commandes
  const [
    { data: ordersData },
    { count: productCount },
    { data: recentOrders },
    { data: orderItemsData },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, total, amount_paid, created_at")
      .eq("shop_id", shop.id),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id),
    supabase
      .from("orders")
      .select(
        `
        id,
        public_code,
        status,
        fulfillment,
        total,
        amount_paid,
        payment_status,
        created_at,
        customer:customers(name, phone)
      `
      )
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("order_items")
      .select("order_id, product_name, unit_price, quantity, orders!inner(shop_id)")
      .eq("orders.shop_id", shop.id),
  ]);

  const allOrders = (ordersData as unknown as AnalyticsOrder[]) ?? [];
  const allOrderItems = ((orderItemsData as unknown as AnalyticsOrderItem[]) ?? []).map((i) => ({
    order_id: i.order_id,
    product_name: i.product_name,
    unit_price: i.unit_price,
    quantity: i.quantity,
  }));

  type RawOrder = {
    id: string;
    public_code: string;
    status: string;
    fulfillment: string;
    total: number;
    amount_paid: number;
    payment_status: string;
    created_at: string;
    customer: { name: string; phone: string } | null;
  };

  const formattedRecentOrders = ((recentOrders as unknown as RawOrder[]) ?? []).map((o) => ({
    id: o.id,
    public_code: o.public_code,
    status: o.status,
    fulfillment: o.fulfillment,
    total: o.total,
    amount_paid: o.amount_paid,
    payment_status: o.payment_status,
    created_at: o.created_at,
    customer: o.customer,
  }));

  const url = shopUrl(shop.slug);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête & Bienvenue */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-ink">Bonjour 👋</h1>
        <p className="text-muted text-xs sm:text-sm">
          Voici l&apos;activité de votre boutique <strong>{shop.name}</strong>.
        </p>
      </div>

      {/* Partager ma boutique */}
      <div className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <Store className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-ink">{shop.name}</p>
            <p className="truncate text-xs text-muted">{url}</p>
          </div>
        </div>
        <ShareShopButton url={url} shopName={shop.name} />
      </div>

      {/* Panneau de statistiques V2-D (Périodes, CA 30j, Top produits, Commandes terminées) */}
      <AnalyticsPanel orders={allOrders} orderItems={allOrderItems} />

      {/* Raccourcis navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/tableau-de-bord/commandes"
          className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-xs hover:border-brand-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-sand text-ink">
              <ShoppingBag className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-ink">Commandes</p>
              <p className="text-xs text-muted">
                {allOrders.length} enregistrée{allOrders.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted" />
        </Link>

        <Link
          href="/tableau-de-bord/produits"
          className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-xs hover:border-brand-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-sand text-ink">
              <Package className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-ink">Catalogue</p>
              <p className="text-xs text-muted">{productCount ?? 0} / 20 produits</p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted" />
        </Link>

        <Link
          href="/tableau-de-bord/clients"
          className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-xs hover:border-brand-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-sand text-ink">
              <Users className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-ink">Clients</p>
              <p className="text-xs text-muted">Répertoire & Export CSV</p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted" />
        </Link>
      </div>

      {/* Dernières commandes */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink">Dernières commandes</h2>
          <Link
            href="/tableau-de-bord/commandes"
            className="text-xs font-bold text-brand-700 hover:underline"
          >
            Voir tout
          </Link>
        </div>

        {formattedRecentOrders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-white p-8 text-center">
            <p className="text-sm font-bold text-ink">Aucune commande pour l&apos;instant</p>
            <p className="text-xs text-muted mt-1">
              Partagez le lien de votre boutique à vos clients pour recevoir vos premières ventes.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {formattedRecentOrders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
