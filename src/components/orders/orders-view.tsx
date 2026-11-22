"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, PackageOpen, Download, Lock } from "lucide-react";
import { OrderRow, type OrderRowData } from "./order-row";
import { ORDER_STATUS_LABELS, SIMPLE_ORDER_STATUS_LABELS } from "./order-status-badge";
import { downloadCsv, downloadStyledExcel, type ShopExportMeta } from "@/lib/csv";
import { ExportDropdown } from "@/components/dashboard/export-dropdown";
import { formatFCFA } from "@/lib/format";
import { clearAppBadge } from "@/lib/sound";
import type { Shop } from "@/types/database";

function normalizeStatus(status: string): string {
  if (status === "preparing") return "confirmed";
  if (status === "ready") return "delivering";
  return status;
}

const PAYMENT_STATUS_FR: Record<string, string> = {
  unpaid: "Non payée",
  partial: "Paiement partiel",
  paid: "Payée",
};

export function OrdersView({
  shop,
  orders,
  hasCsvExport = true,
}: {
  shop?: Shop;
  orders: OrderRowData[];
  hasCsvExport?: boolean;
}) {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    clearAppBadge();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const norm = normalizeStatus(o.status);
    const matchesStatus = selectedStatus === "all" || norm === selectedStatus;
    const matchesSearch =
      !search ||
      o.public_code.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.phone.includes(search);
    return matchesStatus && matchesSearch;
  });

  const countByStatus = (status: string) =>
    status === "all"
      ? orders.length
      : orders.filter((o) => normalizeStatus(o.status) === status).length;

  function getExportPayload() {
    const today = new Date().toISOString().slice(0, 10);
    const headers = [
      "Code commande",
      "Date",
      "Client",
      "Téléphone",
      "Statut commande",
      "Mode réception",
      "Zone / Adresse",
      "Total (FCFA)",
      "Encaissé (FCFA)",
      "Reste à payer (FCFA)",
      "Statut paiement",
    ];

    const totalAmount = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalPaid = filteredOrders.reduce((sum, o) => sum + (o.amount_paid || 0), 0);
    const totalRemaining = Math.max(0, totalAmount - totalPaid);

    const rows = filteredOrders.map((o) => {
      const paid = o.amount_paid ?? 0;
      const remaining = Math.max(0, o.total - paid);
      const zoneOrAddress = [o.delivery_zone_name, o.delivery_address].filter(Boolean).join(" — ");
      return [
        o.public_code,
        new Date(o.created_at).toLocaleString("fr-FR"),
        o.customer?.name ?? "Client anonyme",
        o.customer?.phone ?? "",
        ORDER_STATUS_LABELS[o.status] ?? o.status,
        o.fulfillment === "delivery" ? "Livraison" : "Retrait",
        zoneOrAddress,
        formatFCFA(o.total),
        formatFCFA(paid),
        formatFCFA(remaining),
        PAYMENT_STATUS_FR[o.payment_status ?? "unpaid"] ?? "Non payée",
      ];
    });

    const meta: ShopExportMeta = {
      shopName: shop?.name || "Boutique",
      shopSlug: shop?.slug || "boutique",
      primaryColor: shop?.primary_color || "#0F766E",
      phone: shop?.whatsapp_number || "",
      isCertified: Boolean(shop?.is_certified),
      reportTitle: "Rapport des Commandes",
      kpis: [
        { label: "Total commandes", value: filteredOrders.length },
        { label: "Chiffre d'Affaires", value: formatFCFA(totalAmount) },
        { label: "Total Encaissé", value: formatFCFA(totalPaid) },
        { label: "Reste à Recouvrer", value: formatFCFA(totalRemaining) },
      ],
      totalsRow: [
        "TOTAL",
        "",
        "",
        "",
        "",
        "",
        "",
        formatFCFA(totalAmount),
        formatFCFA(totalPaid),
        formatFCFA(totalRemaining),
        "",
      ],
    };

    return { today, headers, rows, meta };
  }

  function handleExportExcel() {
    const { today, headers, rows, meta } = getExportPayload();
    downloadStyledExcel(`commandes-${today}.xls`, headers, rows, meta);
  }

  function handleExportCsv() {
    const { today, headers, rows, meta } = getExportPayload();
    downloadCsv(`commandes-${today}.csv`, headers, rows, meta);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Commandes</h1>
          <p className="text-xs text-muted mt-0.5">
            Gérez vos commandes simplement : confirmez, livrez et suivez vos règlements.
          </p>
        </div>

        {orders.length > 0 &&
          (hasCsvExport ? (
            <ExportDropdown
              count={filteredOrders.length}
              shopName={shop?.name || "Boutique"}
              primaryColor={shop?.primary_color}
              onExportExcel={handleExportExcel}
              onExportCsv={handleExportCsv}
            />
          ) : (
            <Link
              href="/tableau-de-bord/abonnement"
              title="L'export est réservé aux forfaits Business et Premium"
              className="inline-flex h-10 items-center justify-center gap-2 self-start sm:self-auto rounded-2xl border border-line bg-white px-3.5 text-xs font-bold text-muted shadow-xs hover:border-brand-300 hover:text-brand-600 transition-colors"
            >
              <Lock className="size-4 text-amber-600" />
              <span>Export CSV & Excel (Business)</span>
            </Link>
          ))}
      </div>

      {/* Recherche rapide */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" aria-hidden />
        <input
          type="search"
          placeholder="Rechercher par code (CMD-...), nom ou téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-2xl border border-line bg-white pl-10 pr-4 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {/* Onglets statuts simplifiés */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedStatus("all")}
          className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
            selectedStatus === "all"
              ? "bg-brand-600 text-white"
              : "bg-white text-ink border border-line hover:bg-sand"
          }`}
        >
          Toutes ({countByStatus("all")})
        </button>
        {Object.entries(SIMPLE_ORDER_STATUS_LABELS).map(([statusKey, label]) => {
          const count = countByStatus(statusKey);
          return (
            <button
              key={statusKey}
              type="button"
              onClick={() => setSelectedStatus(statusKey)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
                selectedStatus === statusKey
                  ? "bg-brand-600 text-white"
                  : "bg-white text-ink border border-line hover:bg-sand"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Liste des commandes */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-white p-12 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-sand text-muted mb-3">
            <PackageOpen className="size-6" />
          </div>
          <p className="font-bold text-ink text-sm">Aucune commande trouvée</p>
          <p className="text-xs text-muted mt-1 max-w-xs">
            {search
              ? "Aucune commande ne correspond à votre recherche."
              : "Partagez votre boutique sur WhatsApp pour recevoir vos premières ventes !"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredOrders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
