import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Sparkles, Store, User } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";
import { ExplorerCatalog } from "./explorer-catalog";
import type { ExplorerProduct } from "@/types/database";

export const metadata: Metadata = {
  title: "Explorer — Découvrez les boutiques et produits",
  description: "Parcourez les produits de toutes les boutiques en ligne, trouvez des offres exclusives et commandez directement par WhatsApp.",
};

interface ExplorerPageProps {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    tab?: string;
  }>;
}

export default async function ExplorerPage({ searchParams }: ExplorerPageProps) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q?.trim() || "";
  const category = resolvedParams.cat?.trim() || "";
  const initialTab = resolvedParams.tab === "followed" ? "followed" : "all";

  const supabase = await createClient();
  const user = await getUser();

  // 1. Récupération des catégories représentées parmi les boutiques actives
  const { data: catRows } = await supabase
    .from("categories")
    .select("name, shops!inner(status, is_listed_in_explorer)")
    .eq("shops.status", "active")
    .eq("shops.is_listed_in_explorer", true)
    .limit(50);

  const uniqueCategoryNames = Array.from(
    new Set((catRows ?? []).map((c) => c.name.trim()).filter(Boolean))
  )
    .sort()
    .slice(0, 20);

  const categories = uniqueCategoryNames.map((name) => ({ name }));

  // 2. Appel RPC pour obtenir le fil Explorer général et les boutiques suivies
  const [{ data: rawProducts }, followRowsResult, followedProductsResult] = await Promise.all([
    supabase.rpc("get_explorer_products", {
      p_search: null,
      p_category: null,
      p_limit: 150,
      p_offset: 0,
    }),
    user
      ? supabase.from("shop_followers").select("shop_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.rpc("get_followed_shops_products", { p_limit: 150, p_offset: 0 })
      : Promise.resolve({ data: [] }),
  ]);

  const products: ExplorerProduct[] = rawProducts ?? [];
  const followedShopIds: string[] = (followRowsResult.data ?? []).map((f: { shop_id: string }) => f.shop_id);
  const followedProducts: ExplorerProduct[] = followedProductsResult.data ?? [];

  return (
    <div className="min-h-dvh bg-sand/30 text-ink flex flex-col">
      {/* Barre de navigation publique */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-90 transition-opacity">
              <Logo />
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
              <Compass className="size-3" />
              <span>Explorer</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link
                href="/compte/parametres"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-sand transition-colors shadow-xs"
              >
                <User className="size-3.5 text-brand-600" />
                <span className="hidden sm:inline">Mon compte</span>
              </Link>
            ) : (
              <Link
                href="/compte/connexion"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-sand transition-colors shadow-xs"
              >
                <User className="size-3.5 text-muted" />
                <span className="hidden sm:inline">Espace client</span>
                <span className="sm:hidden">Connexion</span>
              </Link>
            )}

            <Link
              href="/tableau-de-bord"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-700 transition-colors shadow-xs"
            >
              <Store className="size-3.5" />
              <span className="hidden sm:inline">Espace Commerçant</span>
              <span className="sm:hidden">Vendre</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 flex flex-col gap-6">
        {/* En-tête de section */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-700">
            <Sparkles className="size-4" />
            <span>Catalogue Multi-Boutiques</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-ink">
            Explorer les pépites du moment
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Commandez directement auprès de vos commerçants locaux via WhatsApp.
          </p>
        </div>

        {/* Catalogue dynamique instantané (0ms de latence au clic sur les filtres) */}
        <ExplorerCatalog
          initialProducts={products}
          followedProducts={followedProducts}
          followedShopIds={followedShopIds}
          isLoggedIn={Boolean(user)}
          categories={categories}
          initialCategory={category}
          initialQuery={query}
          initialTab={initialTab}
        />
      </main>

      {/* Pied de page responsive et centré */}
      <footer className="border-t border-line bg-white py-8 px-4 mt-auto text-center text-xs text-muted space-y-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 sm:gap-6 font-medium text-ink">
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
