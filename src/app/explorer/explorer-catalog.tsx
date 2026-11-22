"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, ShoppingBag } from "lucide-react";
import { ExplorerCard } from "./explorer-card";
import type { ExplorerProduct } from "@/types/database";

interface CategoryOption {
  name: string;
}

interface ExplorerCatalogProps {
  initialProducts: ExplorerProduct[];
  categories: CategoryOption[];
  initialCategory?: string;
  initialQuery?: string;
}

export function ExplorerCatalog({
  initialProducts,
  categories,
  initialCategory = "",
  initialQuery = "",
}: ExplorerCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory || searchParams.get("cat") || ""
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    initialQuery || searchParams.get("q") || ""
  );

  // Synchronisation URL transparente sans rechargement lourd
  function syncUrl(category: string, query: string) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category.trim()) params.set("cat", category.trim());
    const newUrl = params.toString() ? `/explorer?${params.toString()}` : "/explorer";
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", newUrl);
    }
  }

  // Filtrage ultra-rapide en mémoire (0ms de latence)
  const filteredProducts = useMemo(() => {
    let list = initialProducts;

    if (selectedCategory) {
      const targetCat = selectedCategory.toLowerCase();
      list = list.filter(
        (p) => (p.category_name || "").toLowerCase() === targetCat
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => {
        const nameMatch = p.product_name.toLowerCase().includes(q);
        const shopMatch = p.shop_name.toLowerCase().includes(q);
        const descMatch = (p.product_description || "").toLowerCase().includes(q);
        const catMatch = (p.category_name || "").toLowerCase().includes(q);
        return nameMatch || shopMatch || descMatch || catMatch;
      });
    }

    return list;
  }, [initialProducts, selectedCategory, searchQuery]);

  function handleCategorySelect(catName: string) {
    const nextCategory = selectedCategory === catName ? "" : catName;
    setSelectedCategory(nextCategory);
    syncUrl(nextCategory, searchQuery);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchQuery(val);
    syncUrl(selectedCategory, val);
  }

  function handleClearSearch() {
    setSearchQuery("");
    syncUrl(selectedCategory, "");
  }

  function handleResetFilters() {
    setSelectedCategory("");
    setSearchQuery("");
    syncUrl("", "");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Barre de recherche et Catégories réactives */}
      <div className="flex flex-col gap-3.5">
        {/* Champ de recherche instantané */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Rechercher un produit, une marque, une boutique..."
            className="w-full h-12 rounded-2xl border border-line bg-white pl-11 pr-11 text-sm text-ink placeholder:text-muted focus:border-brand-600 focus:outline-none shadow-xs transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1 transition-colors"
              title="Effacer la recherche"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Boutons filtres catégories instantanés (0ms de latence) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => handleCategorySelect("")}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              !selectedCategory
                ? "bg-brand-600 text-white shadow-xs"
                : "border border-line bg-white text-ink hover:bg-sand/60"
            }`}
          >
            Tous les produits
          </button>

          {categories.map((cat) => {
            const isActive = selectedCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleCategorySelect(cat.name)}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-brand-600 text-white shadow-xs"
                    : "border border-line bg-white text-ink hover:bg-sand/60"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compteur et Grille de Produits */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs text-muted">
          <span>
            {filteredProducts.length}{" "}
            {filteredProducts.length > 1 ? "produits disponibles" : "produit disponible"}
          </span>
          {(selectedCategory || searchQuery) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-semibold text-brand-700 hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((prod) => (
              <ExplorerCard key={prod.product_id} product={prod} />
            ))}
          </div>
        ) : (
          <div className="my-10 flex flex-col items-center justify-center rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
            <span className="grid size-14 place-items-center rounded-full bg-sand text-muted mb-3">
              <ShoppingBag className="size-7" />
            </span>
            <h2 className="text-base font-bold text-ink">Aucun produit trouvé</h2>
            <p className="text-xs text-muted max-w-xs mt-1 leading-relaxed">
              {searchQuery || selectedCategory
                ? "Essayez de modifier votre recherche ou de sélectionner une autre catégorie."
                : "Les commerçants sont en train d'ajouter leurs premiers articles dans Explorer."}
            </p>
            {(searchQuery || selectedCategory) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center rounded-2xl bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
