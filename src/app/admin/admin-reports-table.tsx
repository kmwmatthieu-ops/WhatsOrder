"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, EyeOff, Ban, Check, ExternalLink, ShieldAlert, Trash2 } from "lucide-react";
import { resolveReportAction, adminDeleteShopAction } from "./actions";
import { Button } from "@/components/ui/button";

export interface AdminReportRow {
  id: string;
  reporter_id: string | null;
  target_type: string;
  product_id: string | null;
  product_name: string | null;
  shop_id: string | null;
  shop_name: string | null;
  shop_slug: string | null;
  reason: string;
  details: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface AdminReportsTableProps {
  initialReports: AdminReportRow[];
}

const REASON_LABELS: Record<string, string> = {
  produit_interdit: "Produit interdit / illicite",
  contrefacon: "Contrefaçon / Droits",
  arnaque: "Arnaque / Escroquerie",
  inapproprie: "Contenu inapproprié",
  autre: "Autre motif",
};

export function AdminReportsTable({ initialReports }: AdminReportsTableProps) {
  const [reports, setReports] = useState(initialReports);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved_hidden" | "dismissed">("pending");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filteredReports = reports.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  function handleAction(reportId: string, action: "hide_product" | "suspend_shop" | "dismiss") {
    setError(null);
    startTransition(async () => {
      const res = await resolveReportAction(reportId, action);
      if (!res.ok) {
        setError(res.error || "Erreur lors du traitement.");
      } else {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: action === "dismiss" ? "dismissed" : "resolved_hidden",
                  reviewed_at: new Date().toISOString(),
                }
              : r
          )
        );
      }
    });
  }

  function handleDeleteShopFromReport(reportId: string, shopId: string, shopName: string) {
    const confirmMsg =
      `Supprimer DÉFINITIVEMENT la boutique « ${shopName} » suite à ce signalement ?\n\n` +
      `Tous ses produits, commandes, clients et données seront irrévocablement supprimés.`;

    if (!confirm(confirmMsg)) return;

    setError(null);
    startTransition(async () => {
      const res = await adminDeleteShopAction(shopId);
      if (!res.ok) {
        setError(res.error || "Impossible de supprimer la boutique.");
      } else {
        // Marquer le signalement comme résolu
        await resolveReportAction(reportId, "suspend_shop", "Boutique définitivement supprimée par l'administrateur");
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: "resolved_hidden",
                  reviewed_at: new Date().toISOString(),
                  details: (r.details ? r.details + " " : "") + "[Boutique supprimée]",
                }
              : r
          )
        );
      }
    });
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-2xl bg-danger-50 text-danger-600">
            <ShieldAlert className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink">Signalements Explorer & Modération</h3>
              {pendingCount > 0 && (
                <span className="rounded-full bg-danger-600 px-2 py-0.5 text-[10px] font-black text-white">
                  {pendingCount} en attente
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              Traitez les signalements des utilisateurs pour protéger la communauté.
            </p>
          </div>
        </div>

        {/* Filtre onglets */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-sand/60 p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              filter === "pending" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink"
            }`}
          >
            En attente ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              filter === "all" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink"
            }`}
          >
            Tous ({reports.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
          {error}
        </div>
      )}

      {filteredReports.length > 0 ? (
        <div className="overflow-x-auto -mx-5 sm:mx-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2.5 px-4 font-semibold">Date</th>
                <th className="py-2.5 px-4 font-semibold">Cible</th>
                <th className="py-2.5 px-4 font-semibold">Motif & Détails</th>
                <th className="py-2.5 px-4 font-semibold">Statut</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions de modération</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filteredReports.map((r) => {
                const isPendingItem = r.status === "pending";
                return (
                  <tr key={r.id} className="hover:bg-sand/30 transition-colors">
                    <td className="py-3 px-4 text-muted whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-ink">
                          {r.target_type === "product" ? r.product_name || "Produit" : "Boutique"}
                        </span>
                        {r.shop_slug && (
                          <Link
                            href={`/${r.shop_slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] text-brand-700 hover:underline"
                          >
                            <span>{r.shop_name || r.shop_slug}</span>
                            <ExternalLink className="size-3" />
                          </Link>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-danger-800">
                          {REASON_LABELS[r.reason] || r.reason}
                        </span>
                        {r.details && (
                          <p className="text-[11px] text-muted line-clamp-2 italic">
                            « {r.details} »
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {r.status === "pending" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          <AlertTriangle className="size-3" />
                          <span>En attente</span>
                        </span>
                      )}
                      {r.status === "resolved_hidden" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-[10px] font-bold text-danger-700 border border-danger-200">
                          <EyeOff className="size-3" />
                          <span>Masqué / Sanctionné</span>
                        </span>
                      )}
                      {r.status === "dismissed" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold text-muted border border-line">
                          <Check className="size-3" />
                          <span>Classé sans suite</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {isPendingItem ? (
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {r.target_type === "product" && (
                            <button
                              type="button"
                              onClick={() => handleAction(r.id, "hide_product")}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded-xl bg-danger-50 px-2.5 py-1 text-[11px] font-bold text-danger-700 hover:bg-danger-100 transition-colors"
                              title="Masquer immédiatement ce produit d'Explorer et du catalogue"
                            >
                              <EyeOff className="size-3" />
                              <span>Masquer produit</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAction(r.id, "suspend_shop")}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-xl bg-danger-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-danger-700 transition-colors shadow-xs"
                            title="Suspendre complètement la boutique"
                          >
                            <Ban className="size-3" />
                            <span>Suspendre boutique</span>
                          </button>
                          {r.shop_id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteShopFromReport(r.id, r.shop_id!, r.shop_name || r.shop_slug || "cette boutique")}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded-xl border border-danger-300 bg-danger-50 px-2 py-1 text-[11px] font-bold text-danger-700 hover:bg-danger-100 transition-colors"
                              title="Supprimer définitivement la boutique test ou frauduleuse"
                            >
                              <Trash2 className="size-3" />
                              <span>Supprimer boutique</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAction(r.id, "dismiss")}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-muted hover:text-ink hover:bg-sand transition-colors"
                            title="Rejeter ce signalement"
                          >
                            <span>Rejeter</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted italic">Traité</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-muted">
          Aucun signalement {filter === "pending" ? "en attente" : ""}.
        </div>
      )}
    </div>
  );
}
