import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Politique de Confidentialité · ${APP_NAME}`,
  description: `Politique de confidentialité et protection des données personnelles de ${APP_NAME}.`,
};

export default function ConfidentialitePage() {
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
              Protection des Données
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-ink mt-3">
              Politique de Confidentialité
            </h1>
            <p className="text-xs text-muted mt-1">Dernière mise à jour : 22 novembre 2026</p>
          </div>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">1. Responsable du Traitement</h2>
            <p>
              Le responsable du traitement des données collectées sur la plateforme <strong>{APP_NAME}</strong> est <strong>KUKU MOUNGUENGUI MBULU Wences Matthieu Wissy</strong> (Entrepreneur individuel, Libreville), joignable à l&apos;adresse e-mail : <strong>jamstarck68@gmail.com</strong> ou par téléphone au <strong>+241 77 74 55 97 / +241 77 02 18 28</strong>.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">2. Données Collectées</h2>
            <p>
              Dans le cadre de l&apos;utilisation de nos services, nous collectons strictement les données nécessaires au bon fonctionnement de la plateforme :
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Données des commerçants :</strong> adresse e-mail, numéro de téléphone WhatsApp commercial, nom de la boutique, adresse physique de la boutique, catalogue de produits.
              </li>
              <li>
                <strong>Données des clients finaux (acheteurs) :</strong> nom ou prénom, numéro de téléphone WhatsApp (pour la transmission de la commande), adresse de livraison. Aucune inscription n&apos;est exigée pour les acheteurs.
              </li>
            </ul>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">3. Finalité des Traitements</h2>
            <p>Vos données sont exclusivement utilisées pour :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Permettre la création et la gestion des boutiques en ligne ;</li>
              <li>Transmettre les commandes entre clients et commerçants via WhatsApp ;</li>
              <li>Gérer la facturation des abonnements SaaS ;</li>
              <li>Assurer la sécurité, prévenir les abus et administrer la plateforme.</li>
            </ul>
            <p className="font-semibold text-ink">
              Nous ne vendons, ne louons et ne cédons aucune donnée personnelle à des tiers à des fins publicitaires.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">4. Sous-traitants & Hébergement Sécurisé</h2>
            <p>Les données sont stockées et traitées avec des standards industriels de sécurité :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Hébergement de l&apos;application :</strong> Vercel Inc.</li>
              <li><strong>Base de données sécurisée :</strong> Supabase Inc. (isolation stricte par RLS).</li>
              <li><strong>Paiements en ligne sécurisés :</strong> SasPay (conforme aux normes bancaires et mobile money).</li>
            </ul>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">5. Durée de Conservation et Droits</h2>
            <p>
              Les données sont conservées tant que le compte demeure actif. Conformément aux réglementations sur la protection des données, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données.
            </p>
            <p>
              Pour exercer vos droits ou demander la suppression définitive de vos données personnelles, écrivez à : <strong>jamstarck68@gmail.com</strong>.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">6. Personnalisation du Fil Explorer (« Pour vous ») & Vie Privée</h2>
            <p>
              Pour les utilisateurs créant un compte client, nous proposons une expérience personnalisée via l&apos;onglet <strong>« Pour vous »</strong> sur Explorer. Ce service est strictement encadré :
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Consentement explicite :</strong> Les données d&apos;activité (pages consultées, clics produits, recherches) ne sont enregistrées que si vous avez expressément coché le consentement lors de votre inscription ou activé la personnalisation dans vos paramètres.
              </li>
              <li>
                <strong>Confidentialité absolue vis-à-vis des commerçants :</strong> Les commerçants n&apos;ont <strong>aucun accès</strong> à votre historique de navigation, ni à la liste nominative des abonnés de leur boutique. Ils voient uniquement un compteur global anonymisé.
              </li>
              <li>
                <strong>Droit à l&apos;oubli en 1 clic :</strong> Vous pouvez à tout moment désactiver la personnalisation et effacer l&apos;intégralité de votre historique d&apos;activité depuis votre espace client (rubrique <em>« Vie privée & Personnalisation »</em>). Vos données sont alors immédiatement et définitivement purgées.
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
