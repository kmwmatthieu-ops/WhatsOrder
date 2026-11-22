"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Wallet,
  Trophy,
  BarChart3,
  Lock,
  Sparkles,
} from "lucide-react";
import { formatFCFA } from "@/lib/format";

export type AnalyticsOrder = {
  id: string;
  status: string;
  total: number;
  amount_paid: number;
  created_at: string;
};

export type AnalyticsOrderItem = {
  order_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
};

type PeriodKey = "today" | "7d" | "30d" | "month" | "all";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Aujourd'hui",
  "7d": "7 jours",
  "30d": "30 jours",
  month: "Ce mois",
  all: "Tout",
};

export function AnalyticsPanel({
  orders,
  orderItems,
  hasAdvancedStats = true,
}: {
  orders: AnalyticsOrder[];
  orderItems: AnalyticsOrderItem[];
  hasAdvancedStats?: boolean;
}) {
  // Par défaut sur "today" (Aujourd'hui) selon les souhaits du commerçant
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

  const periodStartIso = useMemo(() => {
    const now = new Date();
    if (period === "today") {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    }
    if (period === "7d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    if (period === "30d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    if (period === "month") {
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
    return "";
  }, [period]);

  // Commandes dans la période filtrée
  const periodOrders = useMemo(() => {
    if (!periodStartIso) return orders;
    return orders.filter((o) => o.created_at >= periodStartIso);
  }, [orders, periodStartIso]);

  const activePeriodOrders = useMemo(
    () => periodOrders.filter((o) => o.status !== "cancelled"),
    [periodOrders]
  );

  const revenue = useMemo(
    () => activePeriodOrders.reduce((acc, o) => acc + o.total, 0),
    [activePeriodOrders]
  );

  const totalCollected = useMemo(
    () => activePeriodOrders.reduce((acc, o) => acc + (o.amount_paid ?? 0), 0),
    [activePeriodOrders]
  );

  const completedOrdersCount = useMemo(
    () => periodOrders.filter((o) => o.status === "delivered").length,
    [periodOrders]
  );

  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === "new").length,
    [orders]
  );

  // Évolution quotidienne du CA sur les 30 derniers jours
  const daily30Series = useMemo(() => {
    const now = new Date();
    const map = new Map<string, { label: string; revenue: number; count: number }>();
    const keys: string[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      keys.push(key);
      map.set(key, { label, revenue: 0, count: 0 });
    }

    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.revenue += o.total;
        bucket.count += 1;
      }
    }

    return keys.map((k) => ({ key: k, ...map.get(k)! }));
  }, [orders]);

  const maxDailyRevenue = useMemo(
    () => Math.max(1, ...daily30Series.map((d) => d.revenue)),
    [daily30Series]
  );

  const total30Revenue = useMemo(
    () => daily30Series.reduce((acc, d) => acc + d.revenue, 0),
    [daily30Series]
  );

  // Produits les plus vendus sur la période sélectionnée
  const topProducts = useMemo(() => {
    const validOrderIds = new Set(activePeriodOrders.map((o) => o.id));
    const byProduct = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const item of orderItems) {
      if (!validOrderIds.has(item.order_id)) continue;
      const existing = byProduct.get(item.product_name) ?? {
        name: item.product_name,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += item.unit_price * item.quantity;
      byProduct.set(item.product_name, existing);
    }

    return [...byProduct.values()]
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 5);
  }, [activePeriodOrders, orderItems]);

  const maxProductQty = topProducts[0]?.quantity ?? 1;
  const activeBar =
    selectedDayIdx !== null ? daily30Series[selectedDayIdx] : daily30Series[daily30Series.length - 1];

  return (
    <div className="flex flex-col gap-5">
      {/* Filtres par période (Aujourd'hui par défaut, sélectionnable librement) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
            Statistiques &amp; Performance
          </span>
          {!hasAdvancedStats && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold text-muted border border-line">
              Vue standard
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl border border-line bg-white p-1 shadow-2xs">
          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => {
            const active = period === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                  active
                    ? "bg-brand-600 text-white shadow-2xs"
                    : "text-muted hover:text-ink hover:bg-sand/60"
                }`}
              >
                {PERIOD_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Cartes d'indicateurs clés */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Chiffre d'affaires */}
        <div className="rounded-2xl border border-line bg-white p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              CA ({PERIOD_LABELS[period]})
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-success-50 text-success-600">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <p className="text-xl font-black text-success-700 truncate">{formatFCFA(revenue)}</p>
          <span className="text-[10px] text-muted mt-1">
            {activePeriodOrders.length} commande{activePeriodOrders.length > 1 ? "s" : ""} valide{activePeriodOrders.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Total encaissé */}
        <div className="rounded-2xl border border-line bg-white p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Encaissé</span>
            <span className="grid size-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <Wallet className="size-4" />
            </span>
          </div>
          <p className="text-xl font-black text-ink truncate">{formatFCFA(totalCollected)}</p>
          <span className="text-[10px] text-muted mt-1">
            Reste : {formatFCFA(Math.max(0, revenue - totalCollected))}
          </span>
        </div>

        {/* Commandes terminées (Livrées) */}
        <div className="rounded-2xl border border-line bg-white p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Terminées</span>
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-ink">{completedOrdersCount}</p>
          <span className="text-[10px] text-muted mt-1">Commandes livrées</span>
        </div>

        {/* Commandes en attente */}
        <div className="rounded-2xl border border-line bg-white p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">En attente</span>
            <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-amber-700">{pendingOrdersCount}</p>
          <span className="text-[10px] text-muted mt-1">À confirmer rapidement</span>
        </div>
      </div>

      {/* Graphique d'évolution du CA sur 30 jours + Top Produits */}
      <div className="relative">
        <div
          className={`grid grid-cols-1 lg:grid-cols-5 gap-4 transition-all ${
            !hasAdvancedStats ? "filter blur-[3px] select-none pointer-events-none opacity-40" : ""
          }`}
        >
          {/* Graphique 30 jours */}
          <section className="lg:col-span-3 rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                  <BarChart3 className="size-4 text-brand-600" />
                  <span>Évolution du CA sur 30 jours</span>
                </div>
                <p className="mt-1 text-lg font-black text-ink">
                  {formatFCFA(total30Revenue)}{" "}
                  <span className="text-xs font-normal text-muted">cumulés sur 30j</span>
                </p>
              </div>

              {activeBar && (
                <div className="rounded-xl bg-sand/60 px-3 py-1.5 text-right text-xs">
                  <p className="font-bold text-ink">{activeBar.label}</p>
                  <p className="font-extrabold text-brand-700">{formatFCFA(activeBar.revenue)}</p>
                  <p className="text-[10px] text-muted">
                    {activeBar.count} cmd{activeBar.count > 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Histogramme 30 barres */}
            <div className="flex flex-col gap-1.5 pt-2">
              <div className="flex h-32 items-end gap-1 border-b border-line pb-2">
                {daily30Series.map((day, idx) => {
                  const heightPct =
                    day.revenue > 0 ? Math.max(12, Math.round((day.revenue / maxDailyRevenue) * 100)) : 4;
                  const isSelected =
                    selectedDayIdx === idx ||
                    (selectedDayIdx === null && idx === daily30Series.length - 1);

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setSelectedDayIdx(idx)}
                      onMouseEnter={() => setSelectedDayIdx(idx)}
                      title={`${day.label} : ${formatFCFA(day.revenue)} (${day.count} commande${
                        day.count > 1 ? "s" : ""
                      })`}
                      className="group relative flex h-full flex-1 items-end justify-center focus:outline-none cursor-pointer"
                    >
                      <span
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-md transition-all ${
                          isSelected
                            ? "bg-brand-600"
                            : day.revenue > 0
                              ? "bg-brand-300 group-hover:bg-brand-500"
                              : "bg-sand"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] font-semibold text-muted">
                <span>{daily30Series[0]?.label}</span>
                <span>{daily30Series[14]?.label}</span>
                <span>Aujourd&apos;hui ({daily30Series[29]?.label})</span>
              </div>
            </div>
          </section>

          {/* Produits les plus vendus */}
          <section className="lg:col-span-2 rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
              <Trophy className="size-4 text-accent-500" />
              <span>Produits les plus vendus ({PERIOD_LABELS[period]})</span>
            </div>

            {topProducts.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-sand/20 p-6 text-center">
                <p className="text-xs font-bold text-ink">Aucune vente sur cette période</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Le classement s&apos;affichera dès vos premières commandes enregistrées.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-1">
                {topProducts.map((prod, idx) => {
                  const widthPct = Math.max(10, Math.round((prod.quantity / maxProductQty) * 100));
                  return (
                    <div key={prod.name} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-bold text-ink truncate">
                          {idx + 1}. {prod.name}
                        </span>
                        <span className="shrink-0 font-extrabold text-brand-700">
                          {prod.quantity} vendu{prod.quantity > 1 ? "s" : ""} • {formatFCFA(prod.revenue)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand">
                        <div
                          className="h-full rounded-full bg-brand-600 transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Bannière de déblocage si plan gratuit */}
        {!hasAdvancedStats && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-white/75 p-6 text-center backdrop-blur-[2px] border border-line">
            <div className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 mb-3 shadow-2xs">
              <Lock className="size-6" />
            </div>
            <h3 className="font-extrabold text-ink text-base">Statistiques avancées</h3>
            <p className="text-xs text-muted max-w-sm mt-1 mb-4">
              L&apos;évolution détaillée de votre chiffre d&apos;affaires sur 30 jours et le Top 5 de vos meilleures ventes sont réservés aux forfaits <strong>Business</strong> et <strong>Premium</strong>.
            </p>
            <Link
              href="/tableau-de-bord/abonnement"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition-colors"
            >
              <Sparkles className="size-4" />
              <span>Débloquer les statistiques complètes</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
