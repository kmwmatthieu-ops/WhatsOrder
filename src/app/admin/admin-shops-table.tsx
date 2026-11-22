"use client";

import { useState, useTransition } from "react";
import {
  ExternalLink,
  Search,
  ShieldAlert,
  ShieldCheck,
  BadgeCheck,
  CreditCard,
  Sparkles,
  Calendar,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  toggleShopStatus,
  assignShopSubscriptionAction,
  cancelShopSubscriptionAction,
  toggleShopCertificationAction,
} from "./actions";
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
  is_certified: boolean;
  plan_id: string;
  plan_name: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  subscription_notes?: string | null;
};

export function AdminShopsTable({ initialShops }: { initialShops: AdminShopRow[] }) {
  const [shops, setShops] = useState(initialShops);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended" | "certified" | "premium">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Modal de gestion de forfait
  const [planModalShop, setPlanModalShop] = useState<AdminShopRow | null>(null);

  const filtered = shops.filter((s) => {
    let matchesFilter = true;
    if (filter === "active") matchesFilter = s.status === "active";
    else if (filter === "suspended") matchesFilter = s.status === "suspended";
    else if (filter === "certified") matchesFilter = s.is_certified;
    else if (filter === "premium") matchesFilter = s.plan_id === "premium";

    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase()) ||
      s.owner_email.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Bascule statut boutique (Active / Suspendue)
  function handleToggleStatus(shop: AdminShopRow) {
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

  // Bascule directe de la certification (Accorder / Retirer)
  function handleToggleCertification(shop: AdminShopRow) {
    const nextCertified = !shop.is_certified;
    const confirmMsg = nextCertified
      ? `Accorder officiellement le badge Vérifié à la boutique "${shop.name}" ?`
      : `Retirer la certification officielle de la boutique "${shop.name}" ?`;

    if (!confirm(confirmMsg)) return;

    setPendingId(shop.id);
    startTransition(async () => {
      const res = await toggleShopCertificationAction(shop.id, nextCertified);
      setPendingId(null);
      if (res.ok) {
        setShops((prev) =>
          prev.map((s) => (s.id === shop.id ? { ...s, is_certified: nextCertified } : s))
        );
      } else {
        alert(res.error || "Impossible de modifier la certification.");
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

        <div className="flex flex-wrap gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xl px-3 py-2 text-xs font-bold border transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-ink border-line hover:bg-sand"
            }`}
          >
            Toutes ({shops.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("certified")}
            className={`rounded-xl px-3 py-2 text-xs font-bold border transition-colors cursor-pointer ${
              filter === "certified"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-ink border-line hover:bg-sand"
            }`}
          >
            Certifiées ({shops.filter((s) => s.is_certified).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("premium")}
            className={`rounded-xl px-3 py-2 text-xs font-bold border transition-colors cursor-pointer ${
              filter === "premium"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-ink border-line hover:bg-sand"
            }`}
          >
            Premium ({shops.filter((s) => s.plan_id === "premium").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`rounded-xl px-3 py-2 text-xs font-bold border transition-colors cursor-pointer ${
              filter === "active"
                ? "bg-success-600 text-white border-success-600"
                : "bg-white text-ink border-line hover:bg-sand"
            }`}
          >
            Actives ({shops.filter((s) => s.status === "active").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("suspended")}
            className={`rounded-xl px-3 py-2 text-xs font-bold border transition-colors cursor-pointer ${
              filter === "suspended"
                ? "bg-danger-600 text-white border-danger-600"
                : "bg-white text-ink border-line hover:bg-sand"
            }`}
          >
            Suspendues ({shops.filter((s) => s.status === "suspended").length})
          </button>
        </div>
      </div>

      {/* Cartes boutiques adaptées mobile & desktop */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
            Aucune boutique ne correspond aux critères.
          </div>
        ) : (
          filtered.map((shop) => {
            const isCert = shop.is_certified;
            const isPrem = shop.plan_id === "premium";
            const isBiz = shop.plan_id === "business";

            // Calcul expiration
            let expirationText: string | null = null;
            if (shop.plan_id !== "gratuit") {
              if (!shop.subscription_expires_at) {
                expirationText = "Illimité / Permanent";
              } else {
                const expDate = new Date(shop.subscription_expires_at);
                const diffDays = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                if (diffDays <= 0) {
                  expirationText = `Expiré le ${expDate.toLocaleDateString("fr-FR")}`;
                } else {
                  expirationText = `Jusqu'au ${expDate.toLocaleDateString("fr-FR")} (${diffDays}j restants)`;
                }
              }
            }

            return (
              <div
                key={shop.id}
                className="flex flex-col rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-xs gap-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-base text-ink truncate">{shop.name}</h3>

                      {/* Badge certifié */}
                      {isCert && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">
                          <BadgeCheck className="size-3.5 text-blue-600" />
                          Certifié
                        </span>
                      )}

                      {/* Badge forfait */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                          isPrem
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : isBiz
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-sand text-muted border-line"
                        }`}
                      >
                        {isPrem && <Sparkles className="size-3" />}
                        {shop.plan_name}
                      </span>

                      {/* Statut boutique */}
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
                      <span className="font-semibold text-ink">
                        {shop.orders_count} commande{shop.orders_count > 1 ? "s" : ""}
                      </span>
                      {expirationText && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-medium text-ink">
                            <Calendar className="size-3 text-muted" />
                            {expirationText}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions d'administration */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-line shrink-0">
                    {/* Bouton Gérer le forfait */}
                    <button
                      type="button"
                      onClick={() => setPlanModalShop(shop)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink hover:bg-sand transition-colors cursor-pointer"
                    >
                      <CreditCard className="size-3.5 text-brand-600" />
                      <span>Gérer le forfait</span>
                    </button>

                    {/* Bouton Certification en 1 clic */}
                    <button
                      type="button"
                      disabled={pendingId === shop.id}
                      onClick={() => handleToggleCertification(shop)}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 ${
                        isCert
                          ? "border border-line bg-white text-muted hover:bg-danger-50 hover:text-danger-700 hover:border-danger-200"
                          : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}
                      title={isCert ? "Retirer le badge certifié" : "Attribuer directement le badge certifié"}
                    >
                      <BadgeCheck className="size-3.5" />
                      <span>{isCert ? "Retirer certif." : "Certifier"}</span>
                    </button>

                    {/* Bouton Suspendre / Réactiver */}
                    <button
                      type="button"
                      disabled={pendingId === shop.id}
                      onClick={() => handleToggleStatus(shop)}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 ${
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
              </div>
            );
          })
        )}
      </div>

      {/* Modal interactif : Attribution et Résiliation de Forfait */}
      {planModalShop && (
        <AdminPlanModal
          shop={planModalShop}
          onClose={() => setPlanModalShop(null)}
          onUpdated={(updated) => {
            setShops((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            );
            setPlanModalShop(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Modal d'attribution manuelle de forfait et de résiliation pour une boutique.
 */
function AdminPlanModal({
  shop,
  onClose,
  onUpdated,
}: {
  shop: AdminShopRow;
  onClose: () => void;
  onUpdated: (updated: Partial<AdminShopRow> & { id: string }) => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<string>(shop.plan_id || "gratuit");
  const [durationMonths, setDurationMonths] = useState<number | null>(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    setLoading(true);
    setError(null);
    try {
      const res = await assignShopSubscriptionAction(
        shop.id,
        selectedPlan,
        selectedPlan === "gratuit" ? null : durationMonths,
        notes || undefined
      );

      if (!res.ok) {
        setError(res.error || "Impossible d'attribuer ce forfait.");
        setLoading(false);
        return;
      }

      const planNames: Record<string, string> = {
        gratuit: "Gratuit",
        business: "Business",
        premium: "Premium",
      };

      let expiresAt: string | null = null;
      if (selectedPlan !== "gratuit" && durationMonths) {
        const d = new Date();
        d.setMonth(d.getMonth() + durationMonths);
        expiresAt = d.toISOString();
      }

      onUpdated({
        id: shop.id,
        plan_id: selectedPlan,
        plan_name: planNames[selectedPlan] || selectedPlan,
        subscription_status: "active",
        subscription_expires_at: expiresAt,
      });
    } catch {
      setError("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSubscription() {
    const confirmMsg =
      `Résilier immédiatement le forfait de "${shop.name}" et la remettre en Gratuit ?\n\n` +
      `• Ses produits existants resteront en ligne.\n` +
      `• Aucun nouveau produit ne pourra être ajouté si le catalogue dépasse 5 articles.\n` +
      `• La limite passera à 10 commandes / mois.\n` +
      `• Sa certification officielle (${shop.is_certified ? "ACTIF" : "Inactif"}) restera préservée.`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await cancelShopSubscriptionAction(shop.id, "Résilé manuellement par admin");
      if (!res.ok) {
        setError(res.error || "Impossible de résilier ce forfait.");
        setLoading(false);
        return;
      }

      onUpdated({
        id: shop.id,
        plan_id: "gratuit",
        plan_name: "Gratuit",
        subscription_status: "cancelled",
        subscription_expires_at: null,
      });
    } catch {
      setError("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl border border-line bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-base font-black text-ink">Gérer le forfait commerçant</h3>
            <p className="text-xs text-muted truncate max-w-xs">{shop.name} ({shop.owner_email})</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted hover:bg-sand transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-800">
            {error}
          </div>
        )}

        {/* État actuel */}
        <div className="rounded-2xl border border-line bg-sand/30 p-3 text-xs space-y-1">
          <p className="text-muted">
            Forfait actuel : <strong className="text-ink uppercase">{shop.plan_name}</strong>
          </p>
          {shop.subscription_expires_at ? (
            <p className="text-muted">
              Expire le : <strong className="text-ink">{new Date(shop.subscription_expires_at).toLocaleDateString("fr-FR")}</strong>
            </p>
          ) : (
            <p className="text-muted">Durée : <strong>Permanent / Sans expiration</strong></p>
          )}
          <p className="text-muted">
            Certification : <strong className={shop.is_certified ? "text-blue-700" : "text-muted"}>{shop.is_certified ? "Badge Officiel Vérifié Actif" : "Non certifié"}</strong>
          </p>
        </div>

        {/* Sélecteur de Plan */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink">1. Choisir le forfait à attribuer :</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "gratuit", label: "Gratuit", desc: "5 prod. • 10 cmd" },
              { id: "business", label: "Business", desc: "50 prod. • 100 cmd" },
              { id: "premium", label: "Premium", desc: "Illimité + Certif" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlan(p.id)}
                className={`rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                  selectedPlan === p.id
                    ? "border-brand-600 bg-brand-50/60 ring-2 ring-brand-600"
                    : "border-line bg-white hover:bg-sand"
                }`}
              >
                <p className="text-xs font-black text-ink">{p.label}</p>
                <p className="text-[10px] text-muted mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Durée (si forfait payant) */}
        {selectedPlan !== "gratuit" && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink">2. Durée de validité :</label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { months: 1, label: "1 mois" },
                { months: 3, label: "3 mois" },
                { months: 6, label: "6 mois" },
                { months: 12, label: "1 an" },
                { months: null, label: "Illimité" },
              ].map((d) => (
                <button
                  key={String(d.months)}
                  type="button"
                  onClick={() => setDurationMonths(d.months)}
                  className={`rounded-xl border py-2 px-1 text-center text-xs font-bold transition-all cursor-pointer ${
                    durationMonths === d.months
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-line bg-white text-ink hover:bg-sand"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note interne */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-ink">Note interne (optionnel) :</label>
          <input
            type="text"
            placeholder="Ex : Offert par l'admin, Partenariat..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-10 w-full rounded-xl border border-line px-3 text-xs outline-none focus:border-brand-600"
          />
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col gap-2 pt-2 border-t border-line">
          <button
            type="button"
            disabled={loading}
            onClick={handleAssign}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-600 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? <Spinner className="size-4 text-white" /> : <Sparkles className="size-4" />}
            <span>Enregistrer et appliquer ce forfait</span>
          </button>

          {shop.plan_id !== "gratuit" && (
            <button
              type="button"
              disabled={loading}
              onClick={handleCancelSubscription}
              className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-danger-200 bg-danger-50 text-xs font-bold text-danger-700 hover:bg-danger-100 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <AlertTriangle className="size-3.5" />
              <span>Résilier le forfait immédiatement (retour Gratuit)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
