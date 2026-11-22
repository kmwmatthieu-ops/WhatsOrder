"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, X, ShoppingBag, Heart, Sparkles, User, ArrowRight } from "lucide-react";
import { ExplorerCard } from "./explorer-card";
import type { ExplorerProduct } from "@/types/database";

interface CategoryOption {
  name: string;
}

interface ExplorerCatalogProps {
  initialProducts: ExplorerProduct[];
  followedProducts?: ExplorerProduct[];
  followedShopIds?: string[];
  isLoggedIn?: boolean;
  categories: CategoryOption[];
  initialCategory?: string;
  initialQuery?: string;
  initialTab?: "all" | "followed";
}

export function ExplorerCatalog({
  initialProducts,
  followedProducts = [],
  followedShopIds = [],
  isLoggedIn = false,
  categories,
  initialCategory = "",
  initialQuery = "",
  initialTab = "all",
}: ExplorerCatalogProps) {
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"all" | "followed">(
    (searchParams.get("tab") as "all" | "followed") || initialTab
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory || searchParams.get("cat") || ""
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    initialQuery || searchParams.get("q") || ""
  );

  const followedShopIdsSet = useMemo(() => new Set(followedShopIds), [followedShopIds]);

  // Synchronisation URL transparente sans rechargement lourd
  function syncUrl(tab: "all" | "followed", category: string, query: string) {
    const params = new URLSearchParams();
    if (tab === "followed") params.set("tab", "followed");
    if (query.trim()) params.set("q", query.trim());
    if (category.trim()) params.set("cat", category.trim());
    const newUrl = params.toString() ? `/explorer?${params.toString()}` : "/explorer";
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", newUrl);
    }
  }

  function handleTabChange(tab: "all" | "followed") {
    setActiveTab(tab);
    syncUrl(tab, selectedCategory, searchQuery);
  }

  // Filtrage ultra-rapide en mémoire (0ms de latence)
  const currentBaseList = activeTab === "followed" ? followedProducts : initialProducts;

  const filteredProducts = useMemo(() => {
    let list = currentBaseList;

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
  }, [currentBaseList, selectedCategory, searchQuery]);

  function handleCategorySelect(catName: string) {
    const nextCategory = selectedCategory === catName ? "" : catName;
    setSelectedCategory(nextCategory);
    syncUrl(activeTab, nextCategory, searchQuery);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchQuery(val);
    syncUrl(activeTab, selectedCategory, val);
  }

  function handleClearSearch() {
    setSearchQuery("");
    syncUrl(activeTab, selectedCategory, "");
  }

  function handleResetFilters() {
    setSelectedCategory("");
    setSearchQuery("");
    syncUrl(activeTab, "", "");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sélecteur d'onglet principal (Tous les produits vs Boutiques suivies) */}
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <button
          type="button"
          onClick={() => handleTabChange("all")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-brand-600 text-white shadow-xs"
              : "bg-white text-ink hover:bg-sand/70 border border-line"
          }`}
        >
          <Sparkles className="size-4" />
          <span>Tous les produits</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("followed")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "followed"
              ? "bg-brand-600 text-white shadow-xs"
              : "bg-white text-ink hover:bg-sand/70 border border-line"
          }`}
        >
          <Heart className={`size-4 ${activeTab === "followed" ? "fill-white" : "text-brand-600"}`} />
          <span>Boutiques suivies</span>
          {followedShopIds.length > 0 && (
            <span
              className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${
                activeTab === "followed"
                  ? "bg-white/20 text-white"
                  : "bg-sand text-ink"
              }`}
            >
              {followedShopIds.length}
            </span>
          )}
        </button>
      </div>

      {/* Barre de recherche et Catégories réactives */}
      <div className="flex flex-col gap-3.5">
        {/* Champ de recherche instantané */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={
              activeTab === "followed"
                ? "Rechercher parmi les produits de vos boutiques suivies..."
                : "Rechercher un produit, une marque, une boutique..."
            }
            className="w-full h-12 rounded-2xl border border-line bg-white pl-11 pr-11 text-sm text-ink placeholder:text-muted focus:border-brand-600 focus:outline-none shadow-xs transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1 transition-colors cursor-pointer"
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
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              !selectedCategory
                ? "bg-brand-600 text-white shadow-xs"
                : "border border-line bg-white text-ink hover:bg-sand/60"
            }`}
          >
            Toutes catégories
          </button>

          {categories.map((cat) => {
            const isActive = selectedCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleCategorySelect(cat.name)}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
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
            {activeTab === "followed" && " dans vos boutiques suivies"}
          </span>
          {(selectedCategory || searchQuery) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-semibold text-brand-700 hover:underline cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Cas particulier : Onglet Boutiques suivies et non connecté */}
        {activeTab === "followed" && !isLoggedIn && (
          <div className="my-8 flex flex-col items-center justify-center rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
            <span className="grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600 mb-3">
              <User className="size-7" />
            </span>
            <h2 className="text-base font-bold text-ink">Connectez-vous pour voir vos boutiques suivies</h2>
            <p className="text-xs text-muted max-w-sm mt-1 leading-relaxed">
              Créez ou accédez à votre compte client pour suivre vos boutiques préférées et découvrir leurs nouveautés et promotions en priorité.
            </p>
            <Link
              href="/compte/connexion?redirect=/explorer?tab=followed"
              className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-700 transition-colors shadow-xs"
            >
              <span>Se connecter à mon compte</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}

        {/* Cas particulier : Onglet Boutiques suivies, connecté mais aucune boutique suivie */}
        {activeTab === "followed" && isLoggedIn && followedShopIds.length === 0 && (
          <div className="my-8 flex flex-col items-center justify-center rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
            <span className="grid size-14 place-items-center rounded-full bg-sand text-muted mb-3">
              <Heart className="size-7 text-brand-600" />
            </span>
            <h2 className="text-base font-bold text-ink">Vous ne suivez encore aucune boutique</h2>
            <p className="text-xs text-muted max-w-sm mt-1 leading-relaxed">
              Cliquez sur l&apos;icône « S&apos;abonner » sur la vitrine d&apos;une boutique pour retrouver ici toutes leurs nouveautés et promotions !
            </p>
            <button
              type="button"
              onClick={() => handleTabChange("all")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-700 transition-colors shadow-xs cursor-pointer"
            >
              <span>Découvrir les boutiques du moment</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}

        {/* Affichage standard de la grille si des produits existent */}
        {filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((prod) => (
              <ExplorerCard
                key={prod.product_id}
                product={prod}
                isFollowing={followedShopIdsSet.has(prod.shop_id)}
              />
            ))}
          </div>
        )}

        {/* Aucun produit correspondant aux filtres */}
        {filteredProducts.length === 0 &&
          !(activeTab === "followed" && (!isLoggedIn || followedShopIds.length === 0)) && (
            <div className="my-10 flex flex-col items-center justify-center rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
              <span className="grid size-14 place-items-center rounded-full bg-sand text-muted mb-3">
                <ShoppingBag className="size-7" />
              </span>
              <h2 className="text-base font-bold text-ink">Aucun produit trouvé</h2>
              <p className="text-xs text-muted max-w-xs mt-1 leading-relaxed">
                {searchQuery || selectedCategory
                  ? "Essayez de modifier votre recherche ou de sélectionner une autre catégorie."
                  : activeTab === "followed"
                  ? "Les boutiques que vous suivez n'ont pas encore publié d'articles disponibles."
                  : "Les commerçants sont en train d'ajouter leurs premiers articles dans Explorer."}
              </p>
              {(searchQuery || selectedCategory) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 inline-flex items-center rounded-2xl bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
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
