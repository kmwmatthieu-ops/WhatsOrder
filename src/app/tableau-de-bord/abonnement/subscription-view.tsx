"use client";

import { useState } from "react";
import {
  CreditCard,
  Package,
  ShoppingBag,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  XCircle,
  FileText,
  BarChart3,
  Download,
  MessageCircle,
  Sparkles,
  BadgeCheck,
  Compass,
} from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { MOBILE_MONEY_PAYMENT_CONFIG } from "@/lib/constants";
import type { SubscriptionPlan, Shop, ShopCertification } from "@/types/database";
import type { ShopSubscriptionMetrics } from "@/lib/subscription";
import { UpgradeModal } from "./upgrade-modal";
import { cancelSubscriptionRequest } from "./actions";
import { ShopCertificationCard } from "./shop-certification-card";

type SubscriptionViewProps = {
  shop: Shop;
  metrics: ShopSubscriptionMetrics;
  plans: SubscriptionPlan[];
  latestCertification?: ShopCertification | null;
};

export function SubscriptionView({
  shop,
  metrics,
  plans,
  latestCertification = null,
}: SubscriptionViewProps) {
  const { resolved, productsCount, monthlyOrdersCount, pendingRequest, historyRequests } = metrics;
  const { effectivePlan, actualPlan, isExpired, daysRemaining, subscription } = resolved;

  const [cancelling, setCancelling] = useState(false);

  // Pourcentages des jauges
  const productLimit = effectivePlan.max_products;
  const productPct = productLimit ? Math.min(100, Math.round((productsCount / productLimit) * 100)) : 0;

  const orderLimit = effectivePlan.max_orders_per_month;
  const orderPct = orderLimit ? Math.min(100, Math.round((monthlyOrdersCount / orderLimit) * 100)) : 0;

  // Règle Formule Premium : aucun bouton "Changer de plan", uniquement "Prolonger" à <= 10 jours de l'échéance
  const isPremiumActive = (actualPlan.id === "premium" || effectivePlan.id === "premium") && !isExpired;
  const canRenewPremium = daysRemaining !== null && daysRemaining <= 10;

  async function handleCancelRequest(id: string) {
    if (!confirm("Voulez-vous vraiment annuler cette demande de mise à niveau ?")) return;
    setCancelling(true);
    await cancelSubscriptionRequest(id);
    setCancelling(false);
  }

  function getWhatsAppVerificationLink(req: typeof pendingRequest) {
    if (!req) return "#";
    const text = encodeURIComponent(
      `Bonjour Support Bon Waz à Dealer !\nJ'ai soumis une demande d'abonnement pour ma boutique ${shop.name} :\n- Demande ID : ${req.id.slice(0, 8)}\n- Montant : ${formatFCFA(req.amount_due)}\n- Émetteur : ${req.sender_phone}\nMerci pour la validation !`
    );
    return `https://wa.me/${MOBILE_MONEY_PAYMENT_CONFIG.supportWhatsapp}?text=${text}`;
  }

  return (
    <div className="space-y-6">
      {/* Alerte Expiration Non-destructive */}
      {isExpired && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="size-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h2 className="text-base font-bold">Votre abonnement {actualPlan.name} a expiré</h2>
              <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                <strong>Rassurez-vous : toutes vos données et vos produits sont précieusement conservés.</strong>{" "}
                Votre boutique fonctionne actuellement sous les limites du plan Gratuit (5 produits, 10 commandes/mois).
                Renouvelez votre abonnement pour débloquer immédiatement vos fonctionnalités avancées.
              </p>
              <div className="pt-2">
                <UpgradeModal shop={shop} plans={plans} currentPlanId={actualPlan.id} isExpired={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demande en cours de validation */}
      {pendingRequest && (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6 text-blue-900 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="grid size-10 place-items-center rounded-2xl bg-blue-600 text-white shrink-0">
                <Hourglass className="size-5 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold">Demande de paiement en cours de vérification</h2>
                  <span className="rounded-full bg-blue-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-blue-800">
                    En attente
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Plan demandé : <strong>{pendingRequest.requested_plan_id.toUpperCase()}</strong> ({pendingRequest.duration_months} mois) • Montant : <strong>{formatFCFA(pendingRequest.amount_due)}</strong>
                </p>
                <p className="text-[11px] text-blue-600 mt-0.5">
                  Moyen : {pendingRequest.payment_method.toUpperCase()} • Émetteur : {pendingRequest.sender_phone}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              <a
                href={getWhatsAppVerificationLink(pendingRequest)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#20ba59] transition-all"
              >
                <MessageCircle className="size-3.5" />
                <span>Accélérer sur WhatsApp</span>
              </a>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => handleCancelRequest(pendingRequest.id)}
                className="rounded-xl border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {cancelling ? "Annulation…" : "Annuler"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerte Expiration Imminente Premium (10 jours ou moins) */}
      {isPremiumActive && canRenewPremium && (
        <div className="rounded-3xl border border-purple-200 bg-purple-50/80 p-5 text-purple-900 shadow-xs">
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-purple-700 shrink-0" />
            <div className="flex-1 text-xs sm:text-sm">
              Il vous reste <strong>{daysRemaining} jour{daysRemaining > 1 ? "s" : ""}</strong> d&apos;abonnement Premium. Vous pouvez dès maintenant prolonger pour continuer à bénéficier de tous vos quotas illimités et de votre badge vérifié sans interruption.
            </div>
          </div>
        </div>
      )}

      {/* Carte Résumé du Plan Actuel */}
      <div className="rounded-3xl border border-line bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <CreditCard className="size-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-ink">Formule {effectivePlan.name}</h1>
                  {effectivePlan.badge && (
                    <span className="rounded-full bg-sand border border-line px-2.5 py-0.5 text-[10px] font-black uppercase text-ink">
                      {effectivePlan.badge}
                    </span>
                  )}
                  {subscription?.status === "active" && !isExpired && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success-600 bg-success-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="size-3" />
                      Actif
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {effectivePlan.price_monthly === 0
                    ? "Plan gratuit à vie"
                    : `${formatFCFA(effectivePlan.price_monthly)} par mois`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isPremiumActive && !canRenewPremium ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200 shadow-2xs">
                <Sparkles className="size-4 text-purple-600" />
                <span>Formule Ultime Active</span>
              </span>
            ) : (
              <UpgradeModal
                shop={shop}
                plans={plans}
                currentPlanId={actualPlan.id}
                isExpired={isExpired}
              />
            )}
          </div>
        </div>

        {/* Validité / Expiration */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted/70" />
            <span>
              {subscription?.expires_at ? (
                <>
                  Date de fin de validité :{" "}
                  <strong className="text-ink">
                    {new Date(subscription.expires_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </>
              ) : (
                "Abonnement sans expiration programmée"
              )}
            </span>
          </div>

          {daysRemaining !== null && !isExpired && (
            <span className="rounded-xl bg-sand px-2.5 py-1 text-[11px] font-bold text-ink">
              {daysRemaining > 1 ? `Il vous reste ${daysRemaining} jours` : "Expire aujourd'hui"}
            </span>
          )}
        </div>
      </div>

      {/* 2 Jauges de Consommation en Direct */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Jauge Produits */}
        <div className="rounded-3xl border border-line bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package className="size-5 text-brand-600" />
                <h2 className="text-sm font-black text-ink">Catalogue Produits</h2>
              </div>
              <span className="text-xs font-bold text-muted">
                {productLimit ? `${productsCount} / ${productLimit}` : `${productsCount} (Illimité)`}
              </span>
            </div>

            <p className="text-xs text-muted mb-4">
              {productLimit
                ? `Vous utilisez ${productsCount} sur les ${productLimit} produits autorisés par votre formule.`
                : "Votre formule actuelle vous permet d'ajouter autant de produits que vous le souhaitez."}
            </p>

            {productLimit && (
              <div className="w-full bg-sand rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    productPct >= 100
                      ? "bg-danger-500"
                      : productPct >= 80
                      ? "bg-amber-500"
                      : "bg-brand-600"
                  }`}
                  style={{ width: `${productPct}%` }}
                />
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-[11px]">
            <span className="text-muted">
              {productLimit && productsCount >= productLimit
                ? "Limite atteinte : passez au plan supérieur pour en ajouter"
                : `${productLimit ? productLimit - productsCount : "∞"} places restantes`}
            </span>
            <span className="font-bold text-ink">{productLimit ? `${productPct}%` : "100% libre"}</span>
          </div>
        </div>

        {/* Jauge Commandes Mensuelles */}
        <div className="rounded-3xl border border-line bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-5 text-brand-600" />
                <h2 className="text-sm font-black text-ink">Commandes ce mois-ci</h2>
              </div>
              <span className="text-xs font-bold text-muted">
                {orderLimit ? `${monthlyOrdersCount} / ${orderLimit}` : `${monthlyOrdersCount} (Illimité)`}
              </span>
            </div>

            <p className="text-xs text-muted mb-4">
              {orderLimit
                ? `Nombre de commandes passées depuis le début du mois calendaire.`
                : "Votre formule actuelle vous permet de recevoir des commandes sans aucun plafond."}
            </p>

            {orderLimit && (
              <div className="w-full bg-sand rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    orderPct >= 100
                      ? "bg-danger-500"
                      : orderPct >= 80
                      ? "bg-amber-500"
                      : "bg-brand-600"
                  }`}
                  style={{ width: `${orderPct}%` }}
                />
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-[11px]">
            <span className="text-muted">Réinitialisation automatique le 1er du mois</span>
            <span className="font-bold text-ink">{orderLimit ? `${orderPct}%` : "100% libre"}</span>
          </div>
        </div>
      </div>

      {/* Tableau des Fonctionnalités Incluses */}
      <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
        <h3 className="text-sm font-black text-ink mb-4 flex items-center gap-2">
          <FileText className="size-4 text-brand-600" />
          <span>Fonctionnalités de votre formule {effectivePlan.name}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Visibilité Explorer V3-C */}
          <div className="rounded-2xl border border-line bg-sand/30 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <Compass className="size-4 text-brand-600" />
              <span>
                Visibilité Explorer (×{Number(effectivePlan.visibility_multiplier ?? 1.0).toFixed(1)})
              </span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              {Number(effectivePlan.visibility_multiplier ?? 1.0) > 1.0
                ? `Vos produits bénéficient d'un coefficient multiplicateur de ×${Number(effectivePlan.visibility_multiplier).toFixed(1)} sur le fil public Explorer.`
                : "Visibilité standard (×1.0) dans le catalogue et sur le fil public Explorer."}
            </p>
          </div>

          {/* Droit au Badge de Certification V3-C */}
          <div className="rounded-2xl border border-line bg-sand/30 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <BadgeCheck className="size-4 text-blue-600" />
              <span>Badge officiel vérifié</span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              {effectivePlan.has_certified_badge
                ? "Inclus dans votre forfait. La coche bleue apparaît dès que votre identité est validée par l'administrateur."
                : "Non inclus dans cette formule. Disponible avec la formule Premium."}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-sand/30 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <BarChart3 className="size-4 text-brand-600" />
              <span>Statistiques avancées</span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              {effectivePlan.has_advanced_stats
                ? "Graphiques d'évolution du CA sur 30 jours et top produits inclus."
                : "Disponible à partir du plan Business."}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-sand/30 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <Download className="size-4 text-brand-600" />
              <span>Export CSV des données</span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              {effectivePlan.has_csv_export
                ? "Export direct des listes de commandes et clients vers Excel."
                : "Disponible à partir du plan Business."}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-sand/30 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <MessageCircle className="size-4 text-brand-600" />
              <span>Assistance & Support</span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              {effectivePlan.id === "premium"
                ? "Support prioritaire VIP dédié sur WhatsApp."
                : "Support client standard sur WhatsApp et par e-mail."}
            </p>
          </div>
        </div>
      </div>

      {/* Module de Certification Commerçant Officielle (Exclusivité Premium) */}
      <ShopCertificationCard
        shop={shop}
        isPremium={actualPlan.id === "premium" && !isExpired}
        latestCertification={latestCertification}
      />

      {/* Historique des Demandes de Changement de Plan */}
      {historyRequests.length > 0 && (
        <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
          <h3 className="text-sm font-black text-ink mb-4">Historique de vos règlements d&apos;abonnement</h3>

          <div className="divide-y divide-line text-xs">
            {historyRequests.map((req) => (
              <div key={req.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">
                    Formule {req.requested_plan_id.toUpperCase()} ({req.duration_months} mois) • {formatFCFA(req.amount_due)}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    {new Date(req.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    • {req.payment_method.toUpperCase()} ({req.sender_phone})
                  </p>
                </div>

                <div>
                  {req.status === "approved" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-[11px] font-bold text-success-700">
                      <CheckCircle2 className="size-3.5" />
                      Validé
                    </span>
                  ) : req.status === "pending" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                      <Hourglass className="size-3.5 animate-pulse" />
                      En vérification
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2.5 py-1 text-[11px] font-bold text-danger-700">
                      <XCircle className="size-3.5" />
                      Refusé
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
