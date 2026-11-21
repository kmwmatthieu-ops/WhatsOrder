import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Smartphone,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  Store,
  Zap,
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { Logo } from "@/components/ui/logo";
import { getUser, getMyShop } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await getUser();
  if (user) {
    const shop = await getMyShop();
    if (shop) redirect("/boutiques");
  }

  return (
    <div className="min-h-dvh bg-cream text-ink flex flex-col">
      {/* Navigation publique */}
      <header className="border-b border-line bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-14 sm:h-16 max-w-5xl items-center justify-between px-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Link
              href="/tarifs"
              prefetch={false}
              className="whitespace-nowrap text-xs sm:text-sm font-semibold text-muted hover:text-ink px-2 sm:px-3 py-1.5 rounded-xl transition-colors shrink-0"
            >
              Tarifs
            </Link>
            <Link
              href="/connexion"
              prefetch={false}
              className="whitespace-nowrap text-xs sm:text-sm font-semibold text-muted hover:text-ink px-2 sm:px-3 py-1.5 rounded-xl transition-colors shrink-0"
            >
              Connexion
            </Link>
            <Link
              href="/inscription"
              prefetch={false}
              className="whitespace-nowrap rounded-xl sm:rounded-2xl bg-brand-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-brand-700 active:scale-98 transition-all shrink-0"
            >
              <span>Créer</span>
              <span className="hidden sm:inline">&nbsp;ma boutique</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 text-center max-w-3xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-brand-50 px-3.5 py-1 text-xs font-bold text-brand-700 mb-6">
            <Zap className="size-3.5 text-accent-500 fill-current" />
            <span>Spécial commerçants WhatsApp & Réseaux sociaux</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-ink leading-tight sm:leading-tight">
            Votre boutique en ligne, vos commandes sur{" "}
            <span className="text-[#25D366]">WhatsApp</span>.
          </h1>

          <p className="mt-5 text-sm sm:text-lg text-muted max-w-xl leading-relaxed">
            Fini les commandes perdues dans les messages et les photos envoyées une par une. Créez votre vitrine en 2 minutes et recevez des commandes complètes et prêtes à être livrées.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              href="/inscription"
              prefetch={false}
              className="flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-brand-600 px-8 text-base font-bold text-white shadow-md hover:bg-brand-700 active:scale-98 transition-all"
            >
              <span>Créer ma boutique gratuitement</span>
              <ArrowRight className="size-5" />
            </Link>
            <Link
              href="/connexion"
              prefetch={false}
              className="flex h-13 w-full sm:w-auto items-center justify-center rounded-2xl border border-line bg-white px-6 text-sm font-bold text-ink hover:bg-sand transition-colors"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-success-600" />
              Sans carte bancaire
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-success-600" />
              Opérationnel en 2 minutes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-success-600" />
              100% mobile-first
            </span>
          </div>
        </section>

        {/* 3 Bénéfices Clés du MVP */}
        <section className="bg-white border-y border-line py-16 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
                Tout ce dont vous avez besoin pour vendre simplement
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-muted">
                Une solution indépendante pensée pour la réalité du commerce sur téléphone et les connexions mobiles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bénéfice 1 */}
              <div className="rounded-3xl border border-line bg-sand/40 p-6 flex flex-col gap-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Store className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-ink">1. Catalogue en ligne rapide</h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Présentez jusqu&apos;à 20 articles avec de belles photos compressées en WebP, des prix nets en FCFA et vos options (tailles, couleurs), le tout accessible via un lien unique.
                </p>
              </div>

              {/* Bénéfice 2 */}
              <div className="rounded-3xl border border-line bg-sand/40 p-6 flex flex-col gap-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-[#25D366]/10 text-[#25D366]">
                  <MessageCircle className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-ink">2. Zéro commande perdue</h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Vos clients composent leur panier et vous transmettent leur commande complète sur WhatsApp en un clic avec nom, téléphone, adresse et total calculé.
                </p>
              </div>

              {/* Bénéfice 3 */}
              <div className="rounded-3xl border border-line bg-sand/40 p-6 flex flex-col gap-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-accent-100 text-accent-600">
                  <Smartphone className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-ink">3. Gestion tout-en-un sur mobile</h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Suivez vos commandes du jour, mettez à jour les statuts (en préparation, livrée), enregistrez les paiements reçus et conservez l&apos;historique de vos clients.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section Appel à l'action */}
        <section className="px-4 py-16 text-center max-w-2xl mx-auto flex flex-col items-center gap-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
            Prêt à professionnaliser vos ventes sur WhatsApp ?
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Rejoignez les commerçants qui gagnent du temps chaque jour sur {APP_NAME}.
          </p>
          <Link
            href="/inscription"
            prefetch={false}
            className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-8 text-base font-bold text-white shadow-md hover:bg-brand-700 transition-colors"
          >
            <span>Créer ma boutique gratuitement</span>
            <ArrowRight className="size-5" />
          </Link>
        </section>
      </main>

      {/* Footer minimal (pas de page tarifs) */}
      <footer className="border-t border-line bg-white py-6 px-4 text-center text-xs text-muted">
        <p>© {new Date().getFullYear()} {APP_NAME} · By Wens Matthieu. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
