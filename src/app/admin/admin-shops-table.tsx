"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { toggleShopStatus } from "./actions";
import { shopUrl } from "@/lib/constants";
import { Spinner } from "@/components/ui/spinner";

export type AdminShopRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  owner_email: string;
  status: "active" | "suspended";
  created_at: string;
  orders_count: number;
};

export function AdminShopsTable({ initialShops }: { initialShops: AdminShopRow[] }) {
  const [shops, setShops] = useState(initialShops);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "suspended">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = shops.filter((s) => {
    const matchesStatus = filterStatus === "all" || s.status === filterStatus;
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase()) ||
      s.owner_email.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function handleToggle(shop: AdminShopRow) {
    const nextStatus = shop.status === "active" ? "suspended" : "active";
    const confirmMsg =
      nextStatus === "suspended"
        ? `Suspendre la boutique "${shop.name}" ? Le public verra "Boutique momentanément indisponible".`
        : `Réactiver la boutique "${shop.name}" ?`;

    if (!confirm(confirmMsg)) return;

    setPendingId(shop.id);
    startTransition(async () => {
      const res = await toggleShopStatus(shop.id, nextStatus);
      setPendingId(null);
      if (!res.error) {
        setShops((prev) =>
          prev.map((s) => (s.id === shop.id ? { ...s, status: nextStatus } : s))
        );
      } else {
        alert(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input
            type="search"
            placeholder="Rechercher par nom, slug ou e-mail propriétaire…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-2xl border border-line bg-white pl-10 pr-4 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
          />
        </div>

        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold border transition-colors ${
              filterStatus === "all"
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-ink border-line hover:bg-sand"
            }`}
          >
            Toutes ({shops.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("active")}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold border transition-colors ${
              filterStatus === "active"
                ? "bg-success-600 text-white border-success-600"
                : "bg-white text-ink border-line hover:bg-sand"
            }`}
          >
            Actives ({shops.filter((s) => s.status === "active").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("suspended")}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold border transition-colors ${
              filterStatus === "suspended"
                ? "bg-danger-600 text-white border-danger-600"
                : "bg-white text-ink border-line hover:bg-sand"
            }`}
          >
            Suspendues ({shops.filter((s) => s.status === "suspended").length})
          </button>
        </div>
      </div>

      {/* Cartes boutiques adaptées mobile & desktop */}
      <div className="flex flex-col gap-2.5">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
            Aucune boutique ne correspond aux critères.
          </div>
        ) : (
          filtered.map((shop) => (
            <div
              key={shop.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-ink truncate">{shop.name}</h3>
                  <span
                    className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      shop.status === "active"
                        ? "bg-success-50 text-success-700 border border-success-200"
                        : "bg-danger-50 text-danger-700 border border-danger-200"
                    }`}
                  >
                    {shop.status === "active" ? "Active" : "Suspendue"}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <a
                    href={shopUrl(shop.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-brand-600 hover:underline"
                  >
                    <span>/{shop.slug}</span>
                    <ExternalLink className="size-3" />
                  </a>
                  <span>•</span>
                  <span>{shop.owner_email}</span>
                  <span>•</span>
                  <span>
                    Créée le {new Date(shop.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-ink">
                    {shop.orders_count} commande{shop.orders_count > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                <button
                  type="button"
                  disabled={pendingId === shop.id}
                  onClick={() => handleToggle(shop)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-colors disabled:opacity-60 ${
                    shop.status === "active"
                      ? "border border-danger-600/30 bg-danger-50 text-danger-700 hover:bg-danger-100"
                      : "border border-success-600/30 bg-success-50 text-success-700 hover:bg-success-100"
                  }`}
                >
                  {pendingId === shop.id ? (
                    <Spinner className="size-3.5 text-current" />
                  ) : shop.status === "active" ? (
                    <>
                      <ShieldAlert className="size-3.5" />
                      <span>Suspendre</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-3.5" />
                      <span>Réactiver</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
