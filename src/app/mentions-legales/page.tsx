import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Mentions Légales · ${APP_NAME}`,
  description: `Mentions légales et informations éditeur de ${APP_NAME}.`,
};

export default function MentionsLegalesPage() {
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
              Informations Légales
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-ink mt-3">
              Mentions Légales
            </h1>
            <p className="text-xs text-muted mt-1">Conformément aux obligations légales de transparence</p>
          </div>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">1. Éditeur de la Plateforme</h2>
            <p>
              Le site internet et le service <strong>{APP_NAME}</strong> sont édités et exploités par :
            </p>
            <ul className="list-none space-y-1 pl-2">
              <li><strong>Raison sociale ou Nom :</strong> [NOM DE L&apos;ENTREPRISE OU DU PROPRIÉTAIRE]</li>
              <li><strong>Forme juridique :</strong> [FORME JURIDIQUE]</li>
              <li><strong>Capital social :</strong> [CAPITAL SOCIAL]</li>
              <li><strong>Siège social :</strong> [ADRESSE DU SIÈGE]</li>
              <li><strong>Numéro d&apos;immatriculation / RCCM :</strong> [NUMÉRO D&apos;ENREGISTREMENT / RCCM]</li>
              <li><strong>Directeur de la publication :</strong> [NOM DU DIRECTEUR DE LA PUBLICATION]</li>
              <li><strong>E-mail de contact :</strong> [E-MAIL DE CONTACT]</li>
              <li><strong>Téléphone :</strong> [NUMÉRO DE TÉLÉPHONE]</li>
            </ul>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">2. Hébergement du Service</h2>
            <p>
              L&apos;infrastructure applicative et l&apos;hébergement web sont assurés par :
            </p>
            <ul className="list-none space-y-1 pl-2">
              <li><strong>Hébergeur Cloud :</strong> Vercel Inc.</li>
              <li><strong>Adresse :</strong> 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</li>
              <li><strong>Site officiel :</strong> https://vercel.com</li>
            </ul>
            <p className="mt-2">
              Les bases de données sont gérées sur l&apos;infrastructure sécurisée de :
            </p>
            <ul className="list-none space-y-1 pl-2">
              <li><strong>Fournisseur Cloud :</strong> Supabase Inc.</li>
              <li><strong>Site officiel :</strong> https://supabase.com</li>
            </ul>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold text-ink">3. Propriété Intellectuelle</h2>
            <p>
              L&apos;ensemble des éléments constituant la plateforme {APP_NAME} (textes, graphismes, logiciels, photographies, logos, marques) est protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation ou diffusion totale ou partielle sans autorisation expresse de l&apos;éditeur est interdite.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
