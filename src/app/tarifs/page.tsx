import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Zap, HelpCircle, ShieldCheck, Sparkles, Smartphone, BadgeCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { getActiveSubscriptionPlans } from "@/lib/subscription";
import { getUser } from "@/lib/supabase/server";
import { formatFCFA } from "@/lib/format";
import { MOBILE_MONEY_PAYMENT_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Tarifs & Abonnements — Bon Waz à Dealer",
  description: "Des tarifs simples et transparents pour développer votre boutique en ligne WhatsApp. Démarrez gratuitement ou passez à Business/Premium par Mobile Money.",
};

export default async function TarifsPage() {
  const [plans, user] = await Promise.all([
    getActiveSubscriptionPlans(),
    getUser(),
  ]);

  return (
    <div className="min-h-dvh bg-cream text-ink flex flex-col overflow-x-hidden">
      {/* Navigation publique */}
      <header className="border-b border-line bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-14 sm:h-16 max-w-5xl items-center justify-between px-3 sm:px-6">
          <Link href="/" prefetch={false} className="shrink-0 hover:opacity-90 transition-opacity">
            <Logo />
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <Link
              href="/explorer"
              prefetch={false}
              className="whitespace-nowrap text-xs sm:text-sm font-semibold text-muted hover:text-ink px-2 sm:px-3 py-1.5 rounded-xl transition-colors shrink-0"
            >
              Explorer
            </Link>
            {user ? (
              <Link
                href="/boutiques"
                prefetch={false}
                className="whitespace-nowrap rounded-xl sm:rounded-2xl bg-brand-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-brand-700 active:scale-98 transition-all shrink-0"
              >
                Tableau de bord
              </Link>
            ) : (
              <>
                <Link
                  href="/connexion"
                  prefetch={false}
                  className="whitespace-nowrap text-xs sm:text-sm font-semibold text-muted hover:text-ink px-2 sm:px-2.5 py-1.5 rounded-xl transition-colors shrink-0"
                >
                  Connexion
                </Link>
                <Link
                  href="/inscription"
                  prefetch={false}
                  className="whitespace-nowrap rounded-xl sm:rounded-2xl bg-brand-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-brand-700 active:scale-98 transition-all shrink-0"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* En-tête Hero */}
        <section className="px-4 pt-10 pb-8 sm:pt-16 sm:pb-12 text-center max-w-3xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-600/20 bg-brand-50 px-3.5 py-1 text-xs font-bold text-brand-700 mb-4">
            <Sparkles className="size-3.5 text-accent-500 fill-current" />
            <span>Paiement Mobile Money • Zéro frais cachés</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-ink leading-tight">
            Des tarifs simples pour booster vos ventes
          </h1>
          <p className="mt-4 text-sm sm:text-base text-muted max-w-xl leading-relaxed">
            Démarrez gratuitement et passez à la vitesse supérieure quand votre catalogue s&apos;élargit.
            Aucun prélèvement automatique, paiement flexible par Mobile Money.
          </p>
        </section>

        {/* Grille des 3 Plans */}
        <section className="max-w-5xl mx-auto px-4 pt-4 pb-16 sm:pb-24 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-8 items-stretch pt-4">
            {plans.map((plan) => {
              const isGratuit = plan.id === "gratuit" || plan.price_monthly === 0;
              const isPopular = plan.id === "business";
              const isPremium = plan.id === "premium";

              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-3xl p-6 sm:p-7 relative transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl hover:scale-[1.015] cursor-pointer ${
                    isPopular
                      ? "bg-white border-2 border-brand-600 shadow-xl"
                      : "bg-white border border-line shadow-xs hover:border-brand-300"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <span
                        className={`inline-block px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-xs ${
                          isPopular
                            ? "bg-brand-600 text-white"
                            : isPremium
                            ? "bg-purple-600 text-white"
                            : "bg-sand text-ink border border-line"
                        }`}
                      >
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h2 className="text-xl font-black text-ink">{plan.name}</h2>
                    <p className="text-xs text-muted mt-1 leading-relaxed min-h-10">
                      {plan.description}
                    </p>
                  </div>

                  <div className="my-3 pb-5 border-b border-line">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
                        {plan.price_monthly === 0 ? "Gratuit" : formatFCFA(plan.price_monthly)}
                      </span>
                      {plan.price_monthly > 0 && (
                        <span className="text-xs font-semibold text-muted">/ mois</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted mt-1">
                      {plan.price_monthly === 0 ? "Pour toujours, sans limite de temps" : "Paiement mensuel ou trimestriel"}
                    </p>
                  </div>

                  {/* Liste des fonctionnalités */}
                  <ul className="space-y-3 text-xs sm:text-sm text-ink/90 flex-1 my-4">
                    <li className="flex items-center gap-2.5">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                        <Check className="size-3.5 font-bold" />
                      </span>
                      <span>
                        <strong>{plan.max_products ? `${plan.max_products} produits` : "Produits illimités"}</strong>
                      </span>
                    </li>

                    <li className="flex items-center gap-2.5">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                        <Check className="size-3.5 font-bold" />
                      </span>
                      <span>
                        <strong>
                          {plan.max_orders_per_month
                            ? `${plan.max_orders_per_month} commandes / mois`
                            : "Commandes illimitées"}
                        </strong>
                      </span>
                    </li>

                    <li className="flex items-center gap-2.5">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                        <Check className="size-3.5 font-bold" />
                      </span>
                      <span>Boutique publique WhatsApp & QR code</span>
                    </li>

                    {/* Statistiques avancées */}
                    <li className="flex items-center gap-2.5">
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-full ${
                          plan.has_advanced_stats
                            ? "bg-brand-50 text-brand-600"
                            : "bg-sand text-muted/60"
                        }`}
                      >
                        {plan.has_advanced_stats ? (
                          <Check className="size-3.5 font-bold" />
                        ) : (
                          <span className="text-xs text-muted/50 font-bold">•</span>
                        )}
                      </span>
                      <span className={plan.has_advanced_stats ? "" : "text-muted line-through"}>
                        Statistiques avancées & graphiques 30j
                      </span>
                    </li>

                    {/* Export de données : CSV pour Gratuit, Excel pour Business & Premium */}
                    {isGratuit ? (
                      <>
                        <li className="flex items-center gap-2.5">
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                            <Check className="size-3.5 font-bold" />
                          </span>
                          <span>Export CSV des commandes et clients</span>
                        </li>
                        <li className="flex items-center gap-2.5 text-muted/60">
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sand text-muted/50">
                            <span className="text-xs font-bold">•</span>
                          </span>
                          <span className="line-through text-muted/70">Export Excel stylisé (.xls)</span>
                        </li>
                      </>
                    ) : (
                      <li className="flex items-center gap-2.5">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                          <Check className="size-3.5 font-bold" />
                        </span>
                        <span>
                          <strong>Export Excel stylisé (.xls)</strong>
                        </span>
                      </li>
                    )}

                    {/* Visibilité Explorer : vert actif pour tous ! */}
                    <li className="flex items-center gap-2.5">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                        <Check className="size-3.5 font-bold" />
                      </span>
                      <span className={!isGratuit ? "font-semibold text-ink" : "text-ink"}>
                        {!isGratuit
                          ? `Visibilité renforcée (×${Number(plan.visibility_multiplier ?? 1.5).toFixed(1)}) sur Explorer`
                          : "Visibilité standard (×1.0) sur Explorer"}
                      </span>
                    </li>

                    {/* Quota produits Explorer */}
                    <li className="flex items-center gap-2.5">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                        <Check className="size-3.5 font-bold" />
                      </span>
                      <span className={!isGratuit ? "font-semibold text-ink" : "text-ink"}>
                        {plan.max_explorer_products ? (
                          <span>
                            <strong>{plan.max_explorer_products} produits</strong> simultanés sur Explorer
                          </span>
                        ) : (
                          <span>
                            <strong>Produits illimités</strong> sur Explorer
                          </span>
                        )}
                      </span>
                    </li>

                    {/* Badge commerçant certifié (dynamique selon plan.has_certified_badge V3-C) */}
                    <li className="flex items-center gap-2.5">
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-full ${
                          plan.has_certified_badge
                            ? "bg-blue-50 text-blue-600"
                            : "bg-sand text-muted/60"
                        }`}
                      >
                        {plan.has_certified_badge ? (
                          <Check className="size-3.5 font-bold" />
                        ) : (
                          <span className="text-xs text-muted/50 font-bold">•</span>
                        )}
                      </span>
                      <span
                        className={
                          plan.has_certified_badge
                            ? "font-bold text-blue-700 inline-flex items-center gap-1.5"
                            : "text-muted line-through"
                        }
                      >
                        <span>Badge de certification vérifié</span>
                        {plan.has_certified_badge && (
                          <BadgeCheck className="size-3.5 fill-blue-600 text-white" />
                        )}
                      </span>
                    </li>

                    {/* Support */}
                    <li className="flex items-center gap-2.5">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                        <Check className="size-3.5 font-bold" />
                      </span>
                      <span>
                        {isPremium ? "Support WhatsApp VIP dédié" : "Support client réactif"}
                      </span>
                    </li>

                    {/* Communauté WhatsApp pour tous */}
                    <li className="flex items-center gap-2.5">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                        <Check className="size-3.5 font-bold" />
                      </span>
                      <span>Accès à la communauté WhatsApp</span>
                    </li>
                  </ul>

                  <div className="pt-4">
                    <Link
                      href="/inscription"
                      className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
                        isPopular
                          ? "bg-brand-600 text-white shadow-md hover:bg-brand-700 active:scale-98"
                          : isPremium
                          ? "bg-ink text-white hover:bg-ink/90 active:scale-98"
                          : "border border-line bg-white text-ink hover:bg-sand"
                      }`}
                    >
                      <span>{plan.price_monthly === 0 ? "Commencer gratuitement" : `Choisir ${plan.name}`}</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Moyens de Paiement Mobile Money acceptés */}
        <section className="bg-white border-y border-line py-12 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-lg font-black text-ink mb-2">
              Comment s&apos;effectuent les paiements d&apos;abonnement ?
            </h3>
            <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto mb-6">
              Pas besoin de carte bancaire internationale. Tous les règlements s&apos;effectuent de façon instantanée et sécurisée via notre passerelle agréée :
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-sand/40 px-6 py-3.5 shadow-xs">
                <Smartphone className="size-5 text-brand-600" />
                <span className="text-sm sm:text-base font-bold text-ink">Mobile Money (Afrique)</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Tarifs */}
        <section className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-black text-ink">Questions fréquentes</h3>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Tout ce que vous devez savoir sur nos formules et leur fonctionnement.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-white p-5">
              <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                <HelpCircle className="size-4 text-brand-600 shrink-0" />
                Que se passe-t-il si mon abonnement payant arrive à expiration ?
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
                <strong>Aucune donnée n&apos;est jamais supprimée.</strong> Vos produits, clients et commandes restent intacts. Votre boutique continue de fonctionner et bascule simplement sous les limites du plan Gratuit (5 produits et 10 commandes/mois). Vous pouvez renouveler à tout moment pour débloquer à nouveau vos fonctionnalités.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                <HelpCircle className="size-4 text-brand-600 shrink-0" />
                Comment activer mon plan après un paiement Mobile Money ?
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
                Depuis votre tableau de bord, onglet « Abonnement », choisissez votre formule. Le paiement s&apos;effectue de manière instantanée et sécurisée par Mobile Money (Afrique) via SasPay. Votre compte et vos quotas sont activés automatiquement à la seconde même où la transaction est confirmée !
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                <HelpCircle className="size-4 text-brand-600 shrink-0" />
                Puis-je changer de plan à tout moment ?
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
                Absolument. Vous pouvez démarrer sur le plan Gratuit et passer au plan Business ou Premium dès que votre activité se développe, sans aucune interruption de service.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Pied de page responsive et centré */}
      <footer className="border-t border-line bg-white py-8 px-4 mt-auto text-center text-xs text-muted space-y-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 sm:gap-6 font-medium text-ink">
          <Link href="/" className="hover:text-brand-600 transition-colors">
            Accueil
          </Link>
          <span className="text-line hidden sm:inline">•</span>
          <Link href="/explorer" className="hover:text-brand-600 transition-colors">
            Explorer
          </Link>
          <span className="text-line hidden sm:inline">•</span>
          <Link href="/cgu" className="hover:text-brand-600 transition-colors">
            CGU
          </Link>
          <span className="text-line hidden sm:inline">•</span>
          <Link href="/confidentialite" className="hover:text-brand-600 transition-colors">
            Confidentialité
          </Link>
          <span className="text-line hidden sm:inline">•</span>
          <Link href="/mentions-legales" className="hover:text-brand-600 transition-colors">
            Mentions légales
          </Link>
        </div>
        <p className="text-[11px] sm:text-xs text-muted max-w-md sm:max-w-none mx-auto leading-relaxed">
          © {new Date().getFullYear()} Bon Waz à Dealer · By Wens Matthieu · Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
