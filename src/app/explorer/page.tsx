import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Sparkles, Store, User, ShoppingBag } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";
import { ExplorerSearch } from "./explorer-search";
import { ExplorerCard } from "./explorer-card";
import type { ExplorerProduct } from "@/types/database";

export const metadata: Metadata = {
  title: "Explorer — Découvrez les boutiques et produits",
  description: "Parcourez les produits de toutes les boutiques en ligne, trouvez des offres exclusives et commandez directement par WhatsApp.",
};

interface ExplorerPageProps {
  searchParams: Promise<{
    q?: string;
    cat?: string;
  }>;
}

export default async function ExplorerPage({ searchParams }: ExplorerPageProps) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q?.trim() || "";
  const category = resolvedParams.cat?.trim() || "";

  const supabase = await createClient();
  const user = await getUser();

  // 1. Récupération des catégories représentées parmi les boutiques actives
  const { data: catRows } = await supabase
    .from("categories")
    .select("name, shops!inner(status, is_listed_in_explorer)")
    .eq("shops.status", "active")
    .eq("shops.is_listed_in_explorer", true)
    .limit(40);

  const uniqueCategoryNames = Array.from(
    new Set((catRows ?? []).map((c) => c.name.trim()).filter(Boolean))
  )
    .sort()
    .slice(0, 15);

  const categories = uniqueCategoryNames.map((name) => ({ name }));

  // 2. Appel RPC pour obtenir le fil Explorer filtré côté serveur
  const { data: rawProducts } = await supabase.rpc("get_explorer_products", {
    p_search: query || null,
    p_category: category || null,
    p_limit: 60,
    p_offset: 0,
  });

  const products: ExplorerProduct[] = rawProducts ?? [];

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
            {query
              ? `Résultats pour « ${query} »`
              : category
              ? `Catégorie « ${category} »`
              : "Explorer les pépites du moment"}
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Commandez directement auprès de vos commerçants locaux via WhatsApp.
          </p>
        </div>

        {/* Barre de recherche et catégories */}
        <ExplorerSearch
          categories={categories}
          currentQuery={query}
          currentCategory={category}
        />

        {/* Grille de Produits */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((prod) => (
              <ExplorerCard key={prod.product_id} product={prod} />
            ))}
          </div>
        ) : (
          <div className="my-12 flex flex-col items-center justify-center rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
            <span className="grid size-14 place-items-center rounded-full bg-sand text-muted mb-3">
              <ShoppingBag className="size-7" />
            </span>
            <h2 className="text-base font-bold text-ink">Aucun produit trouvé</h2>
            <p className="text-xs text-muted max-w-xs mt-1 leading-relaxed">
              {query || category
                ? "Essayez de modifier votre recherche ou de sélectionner une autre catégorie."
                : "Les commerçants sont en train d'ajouter leurs premiers articles dans Explorer."}
            </p>
            {(query || category) && (
              <Link
                href="/explorer"
                className="mt-4 inline-flex items-center rounded-2xl bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
              >
                Réinitialiser les filtres
              </Link>
            )}
          </div>
        )}
      </main>

      {/* Pied de page */}
      <footer className="border-t border-line bg-white py-6 px-4 mt-auto">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <p>© {new Date().getFullYear()} Bon Waz à Dealer — Place de marché & Boutiques WhatsApp.</p>
          <div className="flex items-center gap-4">
            <Link href="/cgu" className="hover:underline">CGU</Link>
            <Link href="/confidentialite" className="hover:underline">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:underline">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
