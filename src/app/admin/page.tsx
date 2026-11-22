import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, ArrowLeft, Store, ShoppingBag, CreditCard, DollarSign, LogOut, Wallet, TrendingUp, Users } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { AdminShopsTable, type AdminShopRow } from "./admin-shops-table";
import { type AdminRequestRow } from "./admin-subscription-requests";
import { AdminAccountingChart, type OrderRecord, type ActivityRecord, type SubscriptionRecord } from "./admin-accounting-chart";
import { AdminManagementCard, type AdminUserRow } from "./admin-management-card";
import { AdminReportsTable, type AdminReportRow } from "./admin-reports-table";
import { AdminCertificationsTable, type AdminCertificationRow } from "./admin-certifications-table";
import { AdminPlansManagement } from "./admin-plans-management";
import { AdminPlatformSettingsCard } from "./admin-platform-settings-card";
import { adminSignOut } from "./connexion/actions";
import { Logo } from "@/components/ui/logo";
import { formatFCFA } from "@/lib/format";

export const metadata: Metadata = { title: "Administration générale" };

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect("/admin/connexion");

  const supabase = await createClient();

  // Vérifier le rôle administrateur
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    redirect("/admin/connexion");
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
    identity_verified: Boolean(s.identity_verified),
    is_certified: Boolean(s.is_certified),
    plan_id: s.plan_id ?? "gratuit",
    plan_name: s.plan_name ?? "Gratuit",
    subscription_status: s.subscription_status ?? "none",
    subscription_expires_at: s.subscription_expires_at ?? null,
    subscription_notes: s.subscription_notes ?? null,
  }));

  const activeCount = shopsList.filter((s) => s.status === "active").length;
  const suspendedCount = shopsList.filter((s) => s.status === "suspended").length;

  // 1.bis Administrateurs autorisés (max 2)
  const { data: adminsData } = await supabase.rpc("admin_list_admins");
  const adminsList: AdminUserRow[] = (adminsData ?? []).map((a) => ({
    user_id: a.user_id,
    email: a.email,
    created_at: a.created_at,
  }));

  // 1.ter Signalements Explorer (V3-A)
  const { data: rawReports } = await supabase.rpc("admin_list_reports");
  const reportsList: AdminReportRow[] = (rawReports ?? []).map((rep) => ({
    id: rep.id,
    reporter_id: rep.reporter_id,
    target_type: rep.target_type,
    product_id: rep.product_id,
    product_name: rep.product_name,
    shop_id: rep.shop_id,
    shop_name: rep.shop_name,
    shop_slug: rep.shop_slug,
    reason: rep.reason,
    details: rep.details,
    status: rep.status,
    reviewed_by: rep.reviewed_by,
    reviewed_at: rep.reviewed_at,
    created_at: rep.created_at,
  }));

  // 1.quater Dossiers de Certification Commerçant (V3-B)
  const { data: rawCerts } = await supabase.rpc("admin_list_certifications");
  const certsList: AdminCertificationRow[] = (rawCerts ?? []).map((c) => ({
    id: c.id,
    shop_id: c.shop_id,
    shop_name: c.shop_name,
    shop_slug: c.shop_slug,
    owner_email: c.owner_email,
    business_doc_url: c.business_doc_url,
    identity_doc_url: c.identity_doc_url,
    store_photo_url: c.store_photo_url,
    store_video_url: c.store_video_url,
    status: c.status,
    admin_notes: c.admin_notes,
    submitted_at: c.submitted_at,
    reviewed_at: c.reviewed_at,
    is_certified: c.is_certified,
  }));

  // 1.quinquies Statistiques utilisateurs et chronologie comptable (V3-E)
  const [{ data: usersStatsData }, { data: timelineData }] = await Promise.all([
    supabase.rpc("admin_get_users_stats"),
    supabase.rpc("admin_get_accounting_timeline"),
  ]);

  const usersStats = usersStatsData?.[0] ?? {
    total_users: shopsList.length,
    merchants_count: shopsList.length,
    clients_count: 0,
    active_users_30d: activeCount,
  };

  const timelineOrders = (timelineData?.orders ?? []) as OrderRecord[];
  const timelineActivities = (timelineData?.activities ?? []) as ActivityRecord[];
  const timelineSubs = (timelineData?.subscriptions ?? []) as SubscriptionRecord[];

  // 2. Commandes globales & volume d'affaires (GMV)
  const allOrders = timelineOrders.length > 0 ? timelineOrders : (await supabase.from("orders").select("total, status")).data ?? [];
  const totalOrdersCount = allOrders.length;
  const totalGmv = allOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // 3. Abonnements actifs, demandes en attente et réglages plateforme (V2-E / V3-C)
  const [subRes, reqRes, plansRes, settingsRes] = await Promise.all([
    supabase
      .from("shop_subscriptions")
      .select("*, subscription_plans(price_monthly, name)"),
    supabase
      .from("subscription_requests")
      .select("*, shops(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("subscription_plans")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "community_whatsapp_url")
      .maybeSingle(),
  ]);

  const plansList = plansRes.data ?? [];
  const whatsappCommunityUrl = settingsRes.data?.value ?? "";

  const subscriptions = subRes.data ?? [];
  const now = new Date();

  const activePaidSubs = subscriptions.filter((s) => {
    if (s.plan_id === "gratuit") return false;
    if (s.status !== "active") return false;
    if (s.expires_at && new Date(s.expires_at) < now) return false;
    return true;
  });

  // Calculs financiers SaaS (Abonnements)
  const rawRequests = reqRes.data ?? [];
  const approvedRequests = rawRequests.filter((r) => r.status === "approved");
  const totalSubscriptionsCollected = approvedRequests.reduce(
    (sum, r) => sum + (r.amount_due ?? 0),
    0
  );

  const estimatedMrr = activePaidSubs.reduce((sum, s) => {
    const planPrice = s.subscription_plans?.price_monthly ?? 0;
    return sum + planPrice;
  }, 0);

  const estimatedArr = estimatedMrr * 12;

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
          <div className="flex items-center gap-3">
            <Link
              href="/tableau-de-bord"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline shrink-0 whitespace-nowrap"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Mon espace commerçant</span>
              <span className="sm:hidden">Espace pro</span>
            </Link>
            <form action={adminSignOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-danger-600 hover:bg-danger-50 transition-colors cursor-pointer"
                title="Se déconnecter de l'espace administration"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 sm:p-6 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-black text-ink">Supervision & Administration Générale</h1>
          <p className="text-xs text-muted mt-0.5">
            Tableau de bord de gestion globale de la plateforme, abonnements et modération.
          </p>
        </div>

        {/* Indicateurs Clés de la Plateforme */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
              <p className="text-[11px] text-muted mt-0.5">Passées sur les boutiques</p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Volume Commerces (GMV)</span>
                <DollarSign className="size-4 text-success-600" />
              </div>
              <p className="text-2xl font-black text-ink mt-1.5">{formatFCFA(totalGmv)}</p>
              <p className="text-[11px] text-muted mt-0.5">Ventes globales générées</p>
            </div>
          </div>

          {/* Finances & Modèle Économique Plateforme */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Utilisateurs de la Plateforme
                </span>
                <Users className="size-4 text-brand-600" />
              </div>
              <p className="text-2xl font-black text-ink mt-1.5">
                {usersStats.total_users}{" "}
                <span className="text-xs font-semibold text-muted">comptes</span>
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                <span className="text-brand-700 font-bold">{usersStats.merchants_count} commerçants</span> •{" "}
                <span className="text-ink font-semibold">{usersStats.clients_count} clients</span> •{" "}
                <span className="text-success-600 font-bold">{usersStats.active_users_30d} actifs (30j)</span>
              </p>
            </div>

            <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900">
                  MRR (Revenu Récurrent Mensuel)
                </span>
                <TrendingUp className="size-4 text-purple-700" />
              </div>
              <p className="text-2xl font-black text-purple-900 mt-1.5">
                {formatFCFA(estimatedMrr)}{" "}
                <span className="text-xs font-normal text-purple-700">/ mois</span>
              </p>
              <p className="text-[11px] text-purple-800/80 mt-0.5">
                ARR estimé : <strong>{formatFCFA(estimatedArr)}/an</strong> • {activePaidSubs.length} abonnement{activePaidSubs.length > 1 ? "s" : ""} payant{activePaidSubs.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Section 1 : Statistiques Comptables, Activité & Rétention (Diagramme de Courbe) */}
        <section className="space-y-3">
          <AdminAccountingChart
            orders={timelineOrders}
            activities={timelineActivities}
            subscriptions={timelineSubs}
            subscriptionRequests={requestsList}
          />
        </section>

        {/* Section 1.bis : Dossiers de Certification Commerçant (V3-B) */}
        <section className="space-y-3">
          <AdminCertificationsTable initialCertifications={certsList} />
        </section>

        {/* Section 2 : Gestion des Comptes Administrateurs (max 2) */}
        <section className="space-y-3">
          <AdminManagementCard admins={adminsList} currentUserId={user.id} />
        </section>

        {/* Section 3 : Gestion des Boutiques & Modération */}
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-ink">Boutiques et Modération</h2>
            <p className="text-xs text-muted">Consultez et suspendez ou réactivez les boutiques.</p>
          </div>
          <AdminShopsTable initialShops={shopsList} />
        </section>

        {/* Section 4 : Modération des Signalements (Explorer) */}
        <section className="space-y-3">
          <AdminReportsTable initialReports={reportsList} />
        </section>

        {/* Section 5 : Paramètres des Forfaits & Visibilité (Phase V3-C) */}
        <section className="space-y-3">
          <AdminPlansManagement initialPlans={plansList} />
        </section>

        {/* Section 6 : Réglages Globaux & Communauté WhatsApp (Phase V3-C) */}
        <section className="space-y-3">
          <AdminPlatformSettingsCard initialWhatsappUrl={whatsappCommunityUrl} />
        </section>
      </main>
    </div>
  );
}
