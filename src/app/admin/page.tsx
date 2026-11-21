import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, ArrowLeft, Store, ShoppingBag, CreditCard, DollarSign } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { AdminShopsTable, type AdminShopRow } from "./admin-shops-table";
import { AdminSubscriptionRequests, type AdminRequestRow } from "./admin-subscription-requests";
import { Logo } from "@/components/ui/logo";
import { formatFCFA } from "@/lib/format";

export const metadata: Metadata = { title: "Administration générale" };

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect("/connexion");

  const supabase = await createClient();

  // Vérifier le rôle administrateur
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-danger-50 text-danger-600 mb-4">
          <Shield className="size-7" />
        </div>
        <h1 className="text-xl font-extrabold text-ink">Accès restreint</h1>
        <p className="mt-2 text-sm text-muted">
          Cet espace est strictement réservé aux administrateurs de Bon Waz à Dealer.
        </p>
        <Link
          href="/tableau-de-bord"
          className="mt-6 rounded-2xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs"
        >
          Retour au tableau de bord
        </Link>
      </main>
    );
  }

  // 1. Liste des boutiques
  const { data: shops } = await supabase.rpc("admin_list_shops");

  const shopsList: AdminShopRow[] = (shops ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    owner_id: s.owner_id,
    owner_email: s.owner_email,
    status: s.status,
    created_at: s.created_at,
    orders_count: Number(s.orders_count),
  }));

  const activeCount = shopsList.filter((s) => s.status === "active").length;
  const suspendedCount = shopsList.filter((s) => s.status === "suspended").length;

  // 2. Commandes globales & volume d'affaires (GMV)
  const { data: ordersData } = await supabase
    .from("orders")
    .select("total, status");

  const allOrders = ordersData ?? [];
  const totalOrdersCount = allOrders.length;
  const totalGmv = allOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // 3. Abonnements actifs et demandes en attente (V2-E)
  const [subRes, reqRes] = await Promise.all([
    supabase
      .from("shop_subscriptions")
      .select("*, subscription_plans(price_monthly, name)"),
    supabase
      .from("subscription_requests")
      .select("*, shops(name)")
      .order("created_at", { ascending: false }),
  ]);

  const subscriptions = subRes.data ?? [];
  const now = new Date();

  const activePaidSubs = subscriptions.filter((s) => {
    if (s.plan_id === "gratuit") return false;
    if (s.status !== "active") return false;
    if (s.expires_at && new Date(s.expires_at) < now) return false;
    return true;
  });

  const estimatedMrr = activePaidSubs.reduce((sum, s) => {
    const planPrice = s.subscription_plans?.price_monthly ?? 0;
    return sum + planPrice;
  }, 0);

  const rawRequests = reqRes.data ?? [];
  const requestsList: AdminRequestRow[] = rawRequests.map((r) => ({
    id: r.id,
    shop_id: r.shop_id,
    shop_name: r.shops?.name || "Boutique inconnue",
    requested_plan_id: r.requested_plan_id,
    duration_months: r.duration_months,
    amount_due: r.amount_due,
    payment_method: r.payment_method,
    sender_phone: r.sender_phone,
    transaction_reference: r.transaction_reference,
    status: r.status,
    created_at: r.created_at,
  }));

  return (
    <div className="min-h-dvh bg-cream text-ink">
      <header className="border-b border-line bg-white px-4 py-4 sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-lg bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              Admin
            </span>
          </div>
          <Link
            href="/tableau-de-bord"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline shrink-0 whitespace-nowrap"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Mon espace commerçant</span>
            <span className="sm:hidden">Espace pro</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 sm:p-6 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-black text-ink">Supervision & Administration Générale</h1>
          <p className="text-xs text-muted mt-0.5">
            Tableau de bord de gestion globale de la plateforme, abonnements et modération.
          </p>
        </div>

        {/* 5 Statistiques Globales de la Plateforme (V2-E) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Boutiques</span>
              <Store className="size-4 text-brand-600" />
            </div>
            <p className="text-2xl font-black text-ink mt-1.5">{shopsList.length}</p>
            <p className="text-[11px] text-muted mt-0.5">
              <span className="text-success-600 font-bold">{activeCount} actives</span> • {suspendedCount} suspendues
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Commandes</span>
              <ShoppingBag className="size-4 text-brand-600" />
            </div>
            <p className="text-2xl font-black text-ink mt-1.5">{totalOrdersCount}</p>
            <p className="text-[11px] text-muted mt-0.5">Passées via la plateforme</p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Volume Commerces (GMV)</span>
              <DollarSign className="size-4 text-success-600" />
            </div>
            <p className="text-2xl font-black text-ink mt-1.5">{formatFCFA(totalGmv)}</p>
            <p className="text-[11px] text-muted mt-0.5">Ventes globales générées</p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">MRR Abonnements</span>
              <CreditCard className="size-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-ink mt-1.5">{formatFCFA(estimatedMrr)}</p>
            <p className="text-[11px] text-muted mt-0.5">
              <span className="font-bold text-purple-700">{activePaidSubs.length}</span> payants actifs
            </p>
          </div>
        </div>

        {/* Section 1 : Demandes de Paiement Mobile Money en Attente */}
        <section className="space-y-3">
          <AdminSubscriptionRequests requests={requestsList} />
        </section>

        {/* Section 2 : Gestion des Boutiques & Modération */}
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-ink">Boutiques et Modération</h2>
            <p className="text-xs text-muted">Consultez et suspendez ou réactivez les boutiques.</p>
          </div>
          <AdminShopsTable initialShops={shopsList} />
        </section>
      </main>
    </div>
  );
}
