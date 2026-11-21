import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Conditions Générales d'Utilisation · ${APP_NAME}`,
  description: `Conditions Générales d'Utilisation de la plateforme ${APP_NAME}.`,
};

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-sand/30 text-ink">
      <header className="border-b border-line bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Retour à l&apos;accueil</span>
          </Link>
          <span className="text-sm font-extrabold text-brand-700">{APP_NAME}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-line p-6 sm:p-10 shadow-xs space-y-8">
          <div>
            <span className="text-xs font-extrabold tracking-wider uppercase text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
              Document Légal
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-ink mt-3">
              Conditions Générales d&apos;Utilisation (CGU)
            </h1>
            <p className="text-xs text-muted mt-1">Dernière mise à jour : 22 novembre 2026</p>
          </div>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">1. Présentation de la Plateforme</h2>
            <p>
              La plateforme <strong>{APP_NAME}</strong>, éditée par <strong>[NOM DE L&apos;ENTREPRISE OU DU PROPRIÉTAIRE]</strong>, est un service logiciel (SaaS) permettant à des commerçants indépendants de créer leur boutique en ligne, d&apos;exposer leurs produits et de réceptionner des commandes finalisées par WhatsApp.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">2. Rôle et Responsabilité de la Plateforme</h2>
            <p>
              {APP_NAME} agit exclusivement en qualité d&apos;intermédiaire technique et d&apos;hébergeur de vitrines commerciales. {APP_NAME} n&apos;est en aucun cas partie aux transactions, accords ou litiges intervenant entre les commerçants et leurs clients finaux.
            </p>
            <p>
              Chaque commerçant est seul responsable de l&apos;exactitude des descriptions, de la disponibilité des stocks, de la tarification en FCFA, de la conformité légale des produits proposés, ainsi que de la bonne exécution des livraisons et des encaissements.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">3. Création de Compte et Sécurité</h2>
            <p>
              L&apos;accès à l&apos;espace commerçant nécessite la création d&apos;un compte personnel avec adresse e-mail et mot de passe sécurisé. Le commerçant s&apos;engage à fournir des informations véridiques et à préserver la confidentialité de ses identifiants.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">4. Abonnements et Tarification SaaS</h2>
            <p>
              La plateforme propose différentes formules d&apos;abonnement (Gratuit, Business, Premium) définissant des quotas de produits et des fonctionnalités avancées. Les tarifs applicables sont ceux affichés sur la page officielle <Link href="/tarifs" className="text-brand-600 underline font-semibold">/tarifs</Link>.
            </p>
            <p>
              Les paiements d&apos;abonnement en ligne s&apos;effectuent de façon sécurisée via nos partenaires de paiement agréés (notamment SasPay et transferts Mobile Money).
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">5. Produits et Usages Interdits</h2>
            <p>
              Il est strictement interdit d&apos;utiliser {APP_NAME} pour publier, vendre ou promouvoir :
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Des substances illicites, contrefaçons ou produits dangereux ;</li>
              <li>Des contenus violents, discriminatoires ou diffamatoires ;</li>
              <li>Toute activité frauduleuse ou trompeuse portant préjudice aux consommateurs.</li>
            </ul>
            <p>
              Tout manquement entraîne la suspension immédiate de la boutique et la résiliation du compte sans préavis.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">6. Résiliation et Suppression de Compte</h2>
            <p>
              Le commerçant peut à tout moment cesser d&apos;utiliser le service et procéder à la suppression intégrale de sa boutique et de son compte depuis son tableau de bord.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">7. Contact & Assistance</h2>
            <p>
              Pour toute question relative aux présentes conditions, contactez notre équipe :
              <br />
              <strong>E-mail :</strong> [E-MAIL DE CONTACT]
              <br />
              <strong>Téléphone / WhatsApp :</strong> [NUMÉRO DE TÉLÉPHONE]
              <br />
              <strong>Adresse :</strong> [ADRESSE DU SIÈGE]
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
