import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ExternalLink, LogOut, Plus, Store, User } from "lucide-react";
import { getUser, getMyShops } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/ui/logo";
import { COUNTRIES, formatPhone, splitE164 } from "@/lib/phone";
import { isShopCurrentlyOpen } from "@/lib/opening-hours";
import { shopUrl } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Vos boutiques — Bon Waz à Dealer",
  description: "Sélectionnez votre boutique pour accéder à son tableau de bord.",
};

export default async function BoutiquesPage() {
  const user = await getUser();
  if (!user) redirect("/connexion");

  const shops = await getMyShops();
  if (shops.length === 0) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      {/* Barre supérieure */}
      <header className="border-b border-line bg-white/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-sand/60 px-3 py-1 text-xs font-medium text-ink sm:inline-flex">
              <User className="size-3.5 text-muted" aria-hidden />
              <span className="max-w-[160px] truncate">{user.email}</span>
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors"
                title="Se déconnecter"
              >
                <LogOut className="size-3.5" aria-hidden />
                <span>Déconnexion</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-12">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-0.5 text-xs font-bold text-brand-700">
              <Store className="size-3.5" />
              Espace Commerçant
            </span>
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-muted">
              {shops.length} {shops.length > 1 ? "boutiques" : "boutique"}
            </span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl font-black text-ink">
            Vos boutiques
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Sélectionnez votre boutique pour accéder directement à son tableau de bord, gérer vos commandes et vos produits.
          </p>
        </div>

        {/* Liste des boutiques */}
        <div className="flex flex-col gap-4">
          {shops.map((shop) => {
            const { countryCode } = splitE164(shop.whatsapp_number);
            const country = COUNTRIES.find((c) => c.code === countryCode);
            const flag = country?.flag || "📱";
            const isOpen = isShopCurrentlyOpen(shop.opening_hours);
            const publicLink = shopUrl(shop.slug);

            // Initiales pour l'avatar si pas de logo
            const initials = shop.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join("") || "BW";

            return (
              <div
                key={shop.id}
                className="group relative flex flex-col rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-sm hover:border-brand-500 hover:shadow-md transition-all"
              >
                {/* En-tête de la carte */}
                <div className="flex items-start gap-4">
                  {shop.logo_url ? (
                    <img
                      src={shop.logo_url}
                      alt={shop.name}
                      className="size-14 shrink-0 rounded-2xl border border-line object-cover shadow-inner"
                    />
                  ) : (
                    <div
                      className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white shadow-inner"
                      style={{ backgroundColor: shop.primary_color || "#0F766E" }}
                    >
                      {initials}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg sm:text-xl font-black text-ink group-hover:text-brand-700 transition-colors">
                        {shop.name}
                      </h2>
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        Active
                      </span>
                    </div>

                    <a
                      href={publicLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-brand-600 hover:underline transition-colors"
                      title="Ouvrir le lien public de la boutique"
                    >
                      <span className="truncate">{publicLink.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="size-3 shrink-0" aria-hidden />
                    </a>
                  </div>
                </div>

                {/* Métadonnées : Téléphone & Horaires */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-sand/60 px-2.5 py-1 font-medium text-ink">
                    {country?.iso ? (
                      <img
                        src={`https://flagcdn.com/w40/${country.iso}.png`}
                        srcSet={`https://flagcdn.com/w80/${country.iso}.png 2x`}
                        alt=""
                        width={18}
                        height={13}
                        className="h-3 w-4 shrink-0 rounded-[2px] object-cover shadow-2xs"
                      />
                    ) : (
                      <span>📱</span>
                    )}
                    <span>{formatPhone(shop.whatsapp_number)}</span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold ${
                      isOpen
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-danger-50 text-danger-600"
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    <span>{isOpen ? "Ouvert actuellement" : "Fermé actuellement"}</span>
                  </span>
                </div>

                {/* Action principale : Entrer dans la boutique */}
                <Link
                  href="/tableau-de-bord"
                  className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3.5 text-sm sm:text-base font-bold text-white shadow-sm hover:bg-brand-700 active:scale-[0.99] transition-all"
                >
                  <span>Entrer dans la boutique</span>
                  <ArrowRight className="size-4 sm:size-5" aria-hidden />
                </Link>

                {/* Lien secondaire : Vue client */}
                <a
                  href={publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold text-muted hover:text-brand-700 transition-colors"
                >
                  <Store className="size-3.5" aria-hidden />
                  <span>Voir la vitrine en direct (vue client)</span>
                </a>
              </div>
            );
          })}

          {/* Emplacement multi-boutique futur */}
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line bg-sand/20 p-5 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-sand/70 text-muted">
              <Plus className="size-5" />
            </div>
            <p className="mt-2 text-xs font-bold text-ink">
              Ajouter une autre boutique
            </p>
            <p className="mt-0.5 text-[11px] text-muted max-w-xs">
              La création multi-boutiques pour un même compte sera disponible très prochainement.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
