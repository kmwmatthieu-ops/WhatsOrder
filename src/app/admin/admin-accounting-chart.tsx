"use client";

import { useMemo, useState } from "react";
import {
  TrendingUp,
  Activity,
  Users,
  Repeat,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { AdminSubscriptionRequests, type AdminRequestRow } from "./admin-subscription-requests";

export type OrderRecord = {
  id: string;
  total: number;
  amount_paid: number;
  status: string;
  customer_id: string;
  created_at: string;
};

export type ActivityRecord = {
  id: string;
  activity_type: string;
  customer_id: string;
  created_at: string;
};

export type SubscriptionRecord = {
  id: string;
  amount_due: number;
  requested_plan_id: string;
  status: string;
  created_at: string;
};

interface AdminAccountingChartProps {
  orders: OrderRecord[];
  activities: ActivityRecord[];
  subscriptions: SubscriptionRecord[];
  subscriptionRequests: AdminRequestRow[];
}

type Period = "hours" | "7d" | "30d" | "12m";
type MetricView = "all" | "sales" | "activity" | "retention";

interface DataPoint {
  label: string;
  timestamp: string;
  sales: number;
  ordersCount: number;
  activityCount: number;
  repeatCustomersCount: number;
  subRevenue: number;
}

export function AdminAccountingChart({
  orders,
  activities,
  subscriptions,
  subscriptionRequests,
}: AdminAccountingChartProps) {
  const [activeTab, setActiveTab] = useState<"chart" | "mobile_money">("chart");
  const [period, setPeriod] = useState<Period>("30d");
  const [metricView, setMetricView] = useState<MetricView>("all");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const pendingRequestsCount = useMemo(
    () => subscriptionRequests.filter((r) => r.status === "pending").length,
    [subscriptionRequests]
  );

  // Construction des séries temporelles selon la période choisie
  const series: DataPoint[] = useMemo(() => {
    const now = new Date();
    const points: DataPoint[] = [];

    if (period === "hours") {
      // 24 tranches d'heures pour aujourd'hui (00h à 23h)
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

      for (let h = 0; h < 24; h++) {
        const slotStart = new Date(startOfDay.getTime() + h * 3600 * 1000);
        const slotEnd = new Date(slotStart.getTime() + 3600 * 1000);

        const slotOrders = orders.filter((o) => {
          const d = new Date(o.created_at);
          return d >= slotStart && d < slotEnd && o.status !== "cancelled";
        });

        const slotActivities = activities.filter((a) => {
          const d = new Date(a.created_at);
          return d >= slotStart && d < slotEnd;
        });

        const slotSubs = subscriptions.filter((s) => {
          const d = new Date(s.created_at);
          return d >= slotStart && d < slotEnd;
        });

        // Clients récurrents ayant commandé sur cette heure
        const customerIds = slotOrders.map((o) => o.customer_id).filter(Boolean);
        const repeatCount = new Set(
          customerIds.filter(
            (cid) => orders.filter((o) => o.customer_id === cid && new Date(o.created_at) < slotEnd).length > 1
          )
        ).size;

        points.push({
          label: `${h}h`,
          timestamp: slotStart.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          sales: slotOrders.reduce((sum, o) => sum + (o.total || 0), 0),
          ordersCount: slotOrders.length,
          activityCount: slotActivities.length,
          repeatCustomersCount: repeatCount,
          subRevenue: slotSubs.reduce((sum, s) => sum + (s.amount_due || 0), 0),
        });
      }
    } else if (period === "7d") {
      // 7 derniers jours (J-6 à aujourd'hui)
      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() - i);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(targetDate.getDate() + 1);

        const dayOrders = orders.filter((o) => {
          const d = new Date(o.created_at);
          return d >= targetDate && d < nextDate && o.status !== "cancelled";
        });

        const dayActivities = activities.filter((a) => {
          const d = new Date(a.created_at);
          return d >= targetDate && d < nextDate;
        });

        const daySubs = subscriptions.filter((s) => {
          const d = new Date(s.created_at);
          return d >= targetDate && d < nextDate;
        });

        const customerIds = dayOrders.map((o) => o.customer_id).filter(Boolean);
        const repeatCount = new Set(
          customerIds.filter(
            (cid) => orders.filter((o) => o.customer_id === cid && new Date(o.created_at) < nextDate).length > 1
          )
        ).size;

        points.push({
          label: targetDate.toLocaleDateString("fr-FR", { weekday: "short" }),
          timestamp: targetDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
          sales: dayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
          ordersCount: dayOrders.length,
          activityCount: dayActivities.length,
          repeatCustomersCount: repeatCount,
          subRevenue: daySubs.reduce((sum, s) => sum + (s.amount_due || 0), 0),
        });
      }
    } else if (period === "30d") {
      // 30 derniers jours (J-29 à aujourd'hui)
      for (let i = 29; i >= 0; i--) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() - i);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(targetDate.getDate() + 1);

        const dayOrders = orders.filter((o) => {
          const d = new Date(o.created_at);
          return d >= targetDate && d < nextDate && o.status !== "cancelled";
        });

        const dayActivities = activities.filter((a) => {
          const d = new Date(a.created_at);
          return d >= targetDate && d < nextDate;
        });

        const daySubs = subscriptions.filter((s) => {
          const d = new Date(s.created_at);
          return d >= targetDate && d < nextDate;
        });

        const customerIds = dayOrders.map((o) => o.customer_id).filter(Boolean);
        const repeatCount = new Set(
          customerIds.filter(
            (cid) => orders.filter((o) => o.customer_id === cid && new Date(o.created_at) < nextDate).length > 1
          )
        ).size;

        points.push({
          label: targetDate.getDate() === 1 || i % 5 === 0 ? targetDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "",
          timestamp: targetDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
          sales: dayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
          ordersCount: dayOrders.length,
          activityCount: dayActivities.length,
          repeatCustomersCount: repeatCount,
          subRevenue: daySubs.reduce((sum, s) => sum + (s.amount_due || 0), 0),
        });
      }
    } else {
      // 12 derniers mois (Mois-11 à mois courant)
      for (let i = 11; i >= 0; i--) {
        const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1);

        const monthOrders = orders.filter((o) => {
          const d = new Date(o.created_at);
          return d >= targetMonth && d < nextMonth && o.status !== "cancelled";
        });

        const monthActivities = activities.filter((a) => {
          const d = new Date(a.created_at);
          return d >= targetMonth && d < nextMonth;
        });

        const monthSubs = subscriptions.filter((s) => {
          const d = new Date(s.created_at);
          return d >= targetMonth && d < nextMonth;
        });

        const customerIds = monthOrders.map((o) => o.customer_id).filter(Boolean);
        const repeatCount = new Set(
          customerIds.filter(
            (cid) => orders.filter((o) => o.customer_id === cid && new Date(o.created_at) < nextMonth).length > 1
          )
        ).size;

        points.push({
          label: targetMonth.toLocaleDateString("fr-FR", { month: "short" }),
          timestamp: targetMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
          sales: monthOrders.reduce((sum, o) => sum + (o.total || 0), 0),
          ordersCount: monthOrders.length,
          activityCount: monthActivities.length,
          repeatCustomersCount: repeatCount,
          subRevenue: monthSubs.reduce((sum, s) => sum + (s.amount_due || 0), 0),
        });
      }
    }

    return points;
  }, [period, orders, activities, subscriptions]);

  // Agrégats totaux de la période sélectionnée
  const totals = useMemo(() => {
    const totalSales = series.reduce((sum, p) => sum + p.sales, 0);
    const totalOrders = series.reduce((sum, p) => sum + p.ordersCount, 0);
    const totalActivity = series.reduce((sum, p) => sum + p.activityCount, 0);
    const totalSubs = series.reduce((sum, p) => sum + p.subRevenue, 0);

    // Calcul du taux de récurrence (clients avec >= 2 commandes sur toutes les commandes)
    const customerOrderCounts: Record<string, number> = {};
    for (const o of orders) {
      if (o.customer_id && o.status !== "cancelled") {
        customerOrderCounts[o.customer_id] = (customerOrderCounts[o.customer_id] || 0) + 1;
      }
    }
    const allUniqueCustomers = Object.keys(customerOrderCounts).length;
    const repeatCustomersTotal = Object.values(customerOrderCounts).filter((c) => c > 1).length;
    const retentionRate = allUniqueCustomers > 0 ? Math.round((repeatCustomersTotal / allUniqueCustomers) * 100) : 0;

    const avgBasket = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

    return {
      totalSales,
      totalOrders,
      totalActivity,
      totalSubs,
      retentionRate,
      repeatCustomersTotal,
      allUniqueCustomers,
      avgBasket,
    };
  }, [series, orders]);

  // Paramètres SVG du diagramme de courbe
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 35;
  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingTop - paddingBottom;

  // Maximums pour mise à l'échelle
  const maxSales = Math.max(...series.map((p) => p.sales), 1000);
  const maxActivity = Math.max(...series.map((p) => p.activityCount), 10);
  const maxRetention = Math.max(...series.map((p) => p.repeatCustomersCount), 5);

  // Conversion de points en coordonnées SVG
  const getCoordinates = (index: number, value: number, maxVal: number) => {
    const x = paddingX + (index / (series.length - 1 || 1)) * graphWidth;
    const y = paddingTop + graphHeight - (value / (maxVal || 1)) * graphHeight;
    return { x, y };
  };

  // Générateur de chemin Bezier lisse cubique
  const generateBezierPath = (
    getValue: (p: DataPoint) => number,
    maxVal: number
  ) => {
    if (series.length === 0) return "";
    const coords = series.map((p, idx) => getCoordinates(idx, getValue(p), maxVal));

    if (coords.length === 1) {
      return `M ${coords[0].x} ${coords[0].y}`;
    }

    let d = `M ${coords[0].x} ${coords[0].y}`;

    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    return d;
  };

  // Chemin pour le dégradé de remplissage sous la courbe
  const generateAreaPath = (
    getValue: (p: DataPoint) => number,
    maxVal: number
  ) => {
    const linePath = generateBezierPath(getValue, maxVal);
    if (!linePath) return "";
    const lastX = paddingX + graphWidth;
    const firstX = paddingX;
    const bottomY = paddingTop + graphHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const salesPath = useMemo(() => generateBezierPath((p) => p.sales, maxSales), [series, maxSales]);
  const salesArea = useMemo(() => generateAreaPath((p) => p.sales, maxSales), [series, maxSales]);

  const activityPath = useMemo(() => generateBezierPath((p) => p.activityCount, maxActivity), [series, maxActivity]);
  const activityArea = useMemo(() => generateAreaPath((p) => p.activityCount, maxActivity), [series, maxActivity]);

  const retentionPath = useMemo(() => generateBezierPath((p) => p.repeatCustomersCount, maxRetention), [series, maxRetention]);
  const retentionArea = useMemo(() => generateAreaPath((p) => p.repeatCustomersCount, maxRetention), [series, maxRetention]);

  const activePoint = hoveredIdx !== null ? series[hoveredIdx] : series[series.length - 1];

  return (
    <div className="rounded-3xl border border-line bg-white shadow-xs overflow-hidden">
      {/* En-tête principal & Navigation d'onglets */}
      <div className="p-4 sm:p-5 border-b border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-ink">
              Statistiques Comptables & Activité Plateforme
            </h2>
            <span className="rounded-full bg-brand-50 border border-brand-200/60 px-2 py-0.5 text-[10px] font-bold text-brand-700">
              Live Metrics
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Évolution comptable, volume des ventes, activité des utilisateurs et rétention client.
          </p>
        </div>

        {/* Bascule entre Graphique et Paiements Mobile Money */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-sand/60 p-1 border border-line self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("chart")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "chart"
                ? "bg-white text-ink shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <TrendingUp className="size-3.5 text-brand-600" />
            <span>Diagramme de Courbe</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mobile_money")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "mobile_money"
                ? "bg-white text-ink shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <CreditCard className="size-3.5 text-success-600" />
            <span>Paiements Mobile Money</span>
            {pendingRequestsCount > 0 ? (
              <span className="rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.2 font-black animate-pulse">
                {pendingRequestsCount}
              </span>
            ) : (
              <span className="rounded-full bg-sand text-muted text-[10px] px-1.5 py-0.2">
                {subscriptionRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === "chart" ? (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Barre de Filtres de Périodes & Métriques */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filtre de période */}
            <div className="flex items-center gap-1 bg-sand/40 p-1 rounded-xl border border-line">
              {(
                [
                  { key: "hours", label: "Aujourd'hui (Heures)" },
                  { key: "7d", label: "7 jours" },
                  { key: "30d", label: "30 jours" },
                  { key: "12m", label: "12 mois" },
                ] as const
              ).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setPeriod(p.key);
                    setHoveredIdx(null);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                    period === p.key
                      ? "bg-brand-700 text-white shadow-xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Sélecteur de courbe affichée */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted hidden sm:inline text-[11px] font-semibold">Afficher :</span>
              <button
                type="button"
                onClick={() => setMetricView("all")}
                className={`rounded-lg px-2.5 py-1 font-bold border transition-colors cursor-pointer ${
                  metricView === "all"
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-muted border-line hover:text-ink"
                }`}
              >
                Tout (Multi-courbes)
              </button>
              <button
                type="button"
                onClick={() => setMetricView("sales")}
                className={`rounded-lg px-2.5 py-1 font-bold border transition-colors cursor-pointer ${
                  metricView === "sales"
                    ? "bg-brand-50 text-brand-700 border-brand-300"
                    : "bg-white text-muted border-line hover:text-ink"
                }`}
              >
                Ventes GMV
              </button>
              <button
                type="button"
                onClick={() => setMetricView("activity")}
                className={`rounded-lg px-2.5 py-1 font-bold border transition-colors cursor-pointer ${
                  metricView === "activity"
                    ? "bg-purple-50 text-purple-700 border-purple-300"
                    : "bg-white text-muted border-line hover:text-ink"
                }`}
              >
                Activité
              </button>
              <button
                type="button"
                onClick={() => setMetricView("retention")}
                className={`rounded-lg px-2.5 py-1 font-bold border transition-colors cursor-pointer ${
                  metricView === "retention"
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : "bg-white text-muted border-line hover:text-ink"
                }`}
              >
                Rétention
              </button>
            </div>
          </div>

          {/* Cartes d'indicateurs comptables de la période */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-brand-100 bg-brand-50/30 p-3.5">
              <div className="flex items-center justify-between text-brand-700 text-xs font-bold">
                <span>Ventes GMV Période</span>
                <DollarSign className="size-4" />
              </div>
              <p className="text-xl font-black text-ink mt-1">
                {formatFCFA(totals.totalSales)}
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                {totals.totalOrders} commande{totals.totalOrders > 1 ? "s" : ""} traitée{totals.totalOrders > 1 ? "s" : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-3.5">
              <div className="flex items-center justify-between text-purple-700 text-xs font-bold">
                <span>Activité & Vues</span>
                <Activity className="size-4" />
              </div>
              <p className="text-xl font-black text-ink mt-1">
                {totals.totalActivity.toLocaleString("fr-FR")}
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                Vues, clics & recherches
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-3.5">
              <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
                <span>Rétention Clients</span>
                <Repeat className="size-4" />
              </div>
              <p className="text-xl font-black text-ink mt-1">
                {totals.retentionRate}%
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                {totals.repeatCustomersTotal} client{totals.repeatCustomersTotal > 1 ? "s" : ""} récurrent{totals.repeatCustomersTotal > 1 ? "s" : ""} (&gt; 1 cmd)
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-sand/20 p-3.5">
              <div className="flex items-center justify-between text-ink text-xs font-bold">
                <span>Panier Moyen</span>
                <ShoppingBag className="size-4 text-muted" />
              </div>
              <p className="text-xl font-black text-ink mt-1">
                {formatFCFA(totals.avgBasket)}
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                Par commande confirmée
              </p>
            </div>
          </div>

          {/* Diagramme de Courbe SVG Interactif */}
          <div className="relative rounded-2xl border border-line bg-sand/10 p-4">
            {/* Légende et point actif survolé */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-4 text-xs font-bold">
                {(metricView === "all" || metricView === "sales") && (
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-brand-600" />
                    <span className="text-brand-900">Ventes GMV (FCFA)</span>
                  </div>
                )}
                {(metricView === "all" || metricView === "activity") && (
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-purple-600" />
                    <span className="text-purple-900">Activité (Interactions)</span>
                  </div>
                )}
                {(metricView === "all" || metricView === "retention") && (
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-amber-500" />
                    <span className="text-amber-900">Clients Récurrents</span>
                  </div>
                )}
              </div>

              {activePoint && (
                <div className="rounded-xl border border-line bg-white px-3 py-1 text-xs shadow-xs flex items-center gap-3">
                  <span className="font-bold text-ink">{activePoint.timestamp}</span>
                  <span className="font-extrabold text-brand-700">{formatFCFA(activePoint.sales)}</span>
                  <span className="text-muted font-semibold">• {activePoint.ordersCount} cmd</span>
                  {activePoint.activityCount > 0 && (
                    <span className="text-purple-700 font-semibold">• {activePoint.activityCount} act.</span>
                  )}
                  {activePoint.repeatCustomersCount > 0 && (
                    <span className="text-amber-700 font-semibold">• {activePoint.repeatCustomersCount} récur.</span>
                  )}
                </div>
              )}
            </div>

            {/* Rendu SVG des courbes fluides */}
            <div className="w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-48 sm:h-64 select-none"
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <defs>
                  {/* Dégradé Ventes */}
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F766E" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Dégradé Activité */}
                  <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Dégradé Rétention */}
                  <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Lignes de grille horizontales */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = paddingTop + graphHeight * pct;
                  return (
                    <line
                      key={idx}
                      x1={paddingX}
                      y1={y}
                      x2={paddingX + graphWidth}
                      y2={y}
                      stroke="#E5E7EB"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Courbe Rétention */}
                {(metricView === "all" || metricView === "retention") && (
                  <g>
                    <path d={retentionArea} fill="url(#retentionGrad)" />
                    <path
                      d={retentionPath}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                )}

                {/* Courbe Activité */}
                {(metricView === "all" || metricView === "activity") && (
                  <g>
                    <path d={activityArea} fill="url(#activityGrad)" />
                    <path
                      d={activityPath}
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                )}

                {/* Courbe Ventes GMV */}
                {(metricView === "all" || metricView === "sales") && (
                  <g>
                    <path d={salesArea} fill="url(#salesGrad)" />
                    <path
                      d={salesPath}
                      fill="none"
                      stroke="#0F766E"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </g>
                )}

                {/* Barre verticale de survol interactif */}
                {hoveredIdx !== null && (
                  <g>
                    <line
                      x1={getCoordinates(hoveredIdx, 0, 1).x}
                      y1={paddingTop}
                      x2={getCoordinates(hoveredIdx, 0, 1).x}
                      y2={paddingTop + graphHeight}
                      stroke="#0F766E"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    {/* Point sur Ventes */}
                    {(metricView === "all" || metricView === "sales") && (
                      <circle
                        cx={getCoordinates(hoveredIdx, series[hoveredIdx].sales, maxSales).x}
                        cy={getCoordinates(hoveredIdx, series[hoveredIdx].sales, maxSales).y}
                        r="5"
                        fill="#0F766E"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                    )}
                    {/* Point sur Activité */}
                    {(metricView === "all" || metricView === "activity") && (
                      <circle
                        cx={getCoordinates(hoveredIdx, series[hoveredIdx].activityCount, maxActivity).x}
                        cy={getCoordinates(hoveredIdx, series[hoveredIdx].activityCount, maxActivity).y}
                        r="4"
                        fill="#8B5CF6"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                    )}
                    {/* Point sur Rétention */}
                    {(metricView === "all" || metricView === "retention") && (
                      <circle
                        cx={getCoordinates(hoveredIdx, series[hoveredIdx].repeatCustomersCount, maxRetention).x}
                        cy={getCoordinates(hoveredIdx, series[hoveredIdx].repeatCustomersCount, maxRetention).y}
                        r="4"
                        fill="#F59E0B"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                    )}
                  </g>
                )}

                {/* Étiquettes axe horizontal */}
                {series.map((p, idx) => {
                  if (!p.label) return null;
                  const x = paddingX + (idx / (series.length - 1 || 1)) * graphWidth;
                  return (
                    <text
                      key={idx}
                      x={x}
                      y={svgHeight - 10}
                      textAnchor="middle"
                      className="text-[10px] fill-muted font-bold"
                    >
                      {p.label}
                    </text>
                  );
                })}

                {/* Zones invisibles pour le survol précis */}
                {series.map((_, idx) => {
                  const x = paddingX + (idx / (series.length - 1 || 1)) * graphWidth;
                  const colWidth = graphWidth / (series.length || 1);
                  return (
                    <rect
                      key={idx}
                      x={x - colWidth / 2}
                      y={0}
                      width={colWidth}
                      height={svgHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onTouchStart={() => setHoveredIdx(idx)}
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      ) : (
        /* Onglet des demandes et paiements Mobile Money (historique complet & validation) */
        <div className="p-0">
          <AdminSubscriptionRequests requests={subscriptionRequests} />
        </div>
      )}
    </div>
  );
}
