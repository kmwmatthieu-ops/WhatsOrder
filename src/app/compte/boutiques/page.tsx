import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Compass, Heart, Store, Users, Package } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { getMyFollowedShopsAction } from "@/app/actions/follow";
import { Logo } from "@/components/ui/logo";
import { FollowShopButton } from "@/components/shops/follow-shop-button";

export const metadata: Metadata = {
  title: "Mes boutiques suivies — Bon Waz à Dealer",
  description: "Gérez les boutiques que vous suivez pour recevoir leurs nouveautés et promotions.",
};

export default async function FollowedShopsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/compte/connexion?redirect=/compte/boutiques");
  }

  const followedShops = await getMyFollowedShopsAction();

  return (
    <div className="min-h-dvh bg-sand/30 text-ink flex flex-col">
      {/* Barre de navigation */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Logo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/compte/parametres"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-sand transition-colors shadow-xs"
            >
              <span>Mon compte</span>
            </Link>
            <Link
              href="/explorer"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-700 transition-colors shadow-xs"
            >
              <Compass className="size-3.5" />
              <span>Explorer</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6 flex flex-col gap-6">
        {/* En-tête */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/compte/parametres"
              className="text-muted hover:text-ink transition-colors p-1"
              title="Retour aux paramètres du compte"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
              <Heart className="size-3 fill-brand-600 text-brand-600" />
              <span>Abonnements</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-ink">
            Mes boutiques suivies
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Retrouvez facilement les boutiques que vous aimez pour suivre leurs nouveaux articles et promotions sur Explorer.
          </p>
        </div>

        {/* Liste des boutiques suivies */}
        {followedShops.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {followedShops.map((shop) => (
              <div
                key={shop.shop_id}
                className="group relative flex flex-col justify-between rounded-3xl border border-line bg-white p-5 shadow-xs hover:border-brand-500 hover:shadow-md transition-all"
              >
                <div>
                  {/* Logo et Nom */}
                  <div className="flex items-start gap-3.5 mb-3">
                    {shop.shop_logo_url ? (
                      <img
                        src={shop.shop_logo_url}
                        alt={shop.shop_name}
                        className="size-13 shrink-0 rounded-2xl border border-line object-cover shadow-2xs"
                      />
                    ) : (
                      <div
                        className="flex size-13 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white shadow-2xs"
                        style={{ backgroundColor: shop.shop_primary_color || "#0F766E" }}
                      >
                        {shop.shop_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="truncate text-base font-black text-ink group-hover:text-brand-700 transition-colors">
                          {shop.shop_name}
                        </h2>
                        {shop.is_certified && (
                          <span title="Boutique vérifiée">
                            <BadgeCheck className="size-3.5 fill-blue-600 text-white shrink-0" />
                          </span>
                        )}
                      </div>

                      {/* Métadonnées abonnés & produits */}
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3 text-brand-600" />
                          <span>{shop.followers_count} abonné{shop.followers_count > 1 ? "s" : ""}</span>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Package className="size-3 text-brand-600" />
                          <span>{shop.products_count} produit{shop.products_count > 1 ? "s" : ""}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions : Visiter & Ne plus suivre */}
                <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between gap-2">
                  <Link
                    href={`/${shop.shop_slug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800 hover:underline"
                  >
                    <Store className="size-3.5" />
                    <span>Visiter</span>
                  </Link>

                  <FollowShopButton
                    shopId={shop.shop_id}
                    shopName={shop.shop_name}
                    initialFollowing={true}
                    initialFollowersCount={shop.followers_count}
                    variant="card"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="my-10 flex flex-col items-center justify-center rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
            <span className="grid size-14 place-items-center rounded-full bg-sand text-muted mb-3">
              <Heart className="size-7 text-brand-600" />
            </span>
            <h2 className="text-base font-bold text-ink">Vous ne suivez aucune boutique</h2>
            <p className="text-xs text-muted max-w-sm mt-1 leading-relaxed">
              Explorez les vitrines des commerçants locaux sur Explorer et cliquez sur « Suivre » pour les retrouver ici en un clin d&apos;œil.
            </p>
            <Link
              href="/explorer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-700 transition-colors shadow-xs"
            >
              <span>Découvrir les boutiques sur Explorer</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
