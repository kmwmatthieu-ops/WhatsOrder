import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Heart,
  Package,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { requireShop } from "@/lib/supabase/server";
import { getShopSubscription } from "@/lib/subscription";
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

  // Requêtes parallèles pour les données de la boutique, le forfait et les dernières commandes
  const [
    subscription,
    { data: ordersData },
    { count: productCount },
    { data: recentOrders },
    { data: orderItemsData },
  ] = await Promise.all([
    getShopSubscription(shop.id),
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
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <p className="truncate font-bold text-ink">{shop.name}</p>
              {shop.is_certified && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700 shrink-0"
                  title="Boutique vérifiée et certifiée"
                >
                  <BadgeCheck className="size-3.5 fill-blue-600 text-white" />
                  <span>Certifié</span>
                </span>
              )}
              <span
                className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold text-muted shrink-0"
                title="Nombre d'abonnés suivant votre boutique sur Explorer"
              >
                <Heart className="size-3 text-brand-600 fill-brand-600" />
                <span>{shop.followers_count ?? 0} abonné{(shop.followers_count ?? 0) > 1 ? "s" : ""}</span>
              </span>
            </div>
            <p className="truncate text-xs text-muted">{url}</p>
          </div>
        </div>
        <ShareShopButton url={url} shopName={shop.name} shopSlug={shop.slug} />
      </div>

      {/* Panneau de statistiques V2-D/V2-E (Périodes, CA 30j, Top produits, Commandes terminées) */}
      <AnalyticsPanel
        orders={allOrders}
        orderItems={allOrderItems}
        hasAdvancedStats={subscription.effectivePlan.has_advanced_stats}
      />

      {/* Raccourcis navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              <p className="text-xs text-muted">
                {productCount ?? 0} /{" "}
                {subscription.effectivePlan.max_products
                  ? `${subscription.effectivePlan.max_products} produits`
                  : "illimités"}
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted" />
        </Link>

        <Link
          href="/tableau-de-bord/clients"
          className="flex items-center justify-between gap-2.5 rounded-2xl border border-line bg-white p-3.5 sm:p-4 shadow-xs hover:border-brand-500 transition-colors min-w-0"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="grid size-10 place-items-center rounded-xl bg-sand text-ink shrink-0">
              <Users className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-ink truncate">Clients</p>
              <p className="text-xs text-muted truncate">Répertoire clients</p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted shrink-0" />
        </Link>

        {/* Abonnés de la boutique (Affichage strictement anonyme du compteur) */}
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-white p-3.5 sm:p-4 shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="grid size-10 place-items-center rounded-xl bg-sand text-ink shrink-0">
              <Heart className="size-5 text-brand-600 fill-brand-600" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-ink truncate">Abonnés</p>
              <p className="text-xs text-muted truncate">
                {shop.followers_count ?? 0} abonné{(shop.followers_count ?? 0) > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <span
            className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700"
            title="Clients suivant votre vitrine (données strictement anonymisées)"
          >
            Actifs
          </span>
        </div>
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
