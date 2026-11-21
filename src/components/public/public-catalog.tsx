"use client";

import { useState } from "react";
import { Search, PackageOpen, Clock } from "lucide-react";
import { ProductCard } from "./product-card";
import { ProductDetailModal } from "./product-detail-modal";
import { FloatingCartButton } from "./floating-cart-button";
import { CartDrawer } from "./cart-drawer";
import { isShopCurrentlyOpen } from "@/lib/opening-hours";
import type { Category, ProductWithVariants, Shop } from "@/types/database";

export function PublicCatalog({
  shop,
  categories,
  products,
}: {
  shop: Shop;
  categories: Category[];
  products: ProductWithVariants[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeProduct, setActiveProduct] = useState<ProductWithVariants | null>(null);

  const openStatus = isShopCurrentlyOpen(shop.opening_hours);
  const isShopOpen = openStatus.isOpen;

  // Filtrage combiné : catégorie + recherche
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "all" ||
      (selectedCategory === "none" ? !p.category_id : p.category_id === selectedCategory);
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 flex flex-col gap-5 pb-24">
      {/* Bandeau d'information si la boutique est actuellement fermée */}
      {!isShopOpen && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-900 shadow-2xs"
        >
          <Clock className="size-4 shrink-0 text-rose-600 mt-0.5" aria-hidden />
          <div>
            <p className="font-extrabold">Cette boutique est actuellement fermée</p>
            <p className="mt-0.5 text-rose-700 leading-relaxed">
              Vous pouvez consulter le catalogue, mais la prise de commande est désactivée en dehors des horaires d&apos;ouverture ({openStatus.dayLabel} : {openStatus.hoursText}).
            </p>
          </div>
        </div>
      )}

      {/* Barre de recherche rapide */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" aria-hidden />
        <input
          type="search"
          placeholder="Rechercher un article…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-2xl border border-line bg-white pl-10 pr-4 text-sm outline-none focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {/* Filtres par catégorie */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
              selectedCategory === "all"
                ? "text-white shadow-xs"
                : "bg-white text-ink border border-line hover:bg-sand"
            }`}
            style={selectedCategory === "all" ? { backgroundColor: shop.primary_color } : {}}
          >
            Tous ({products.length})
          </button>
          {categories.map((c) => {
            const count = products.filter((p) => p.category_id === c.id).length;
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  isSelected
                    ? "text-white shadow-xs"
                    : "bg-white text-ink border border-line hover:bg-sand"
                }`}
                style={isSelected ? { backgroundColor: shop.primary_color } : {}}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Grille des produits */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-white p-12 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-sand text-muted mb-3">
            <PackageOpen className="size-6" />
          </div>
          <p className="font-bold text-ink text-sm">Aucun article ne correspond</p>
          <p className="text-xs text-muted mt-1">
            Essayez un autre mot-clé ou sélectionnez une autre catégorie.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              primaryColor={shop.primary_color}
              isShopOpen={isShopOpen}
              onClick={() => setActiveProduct(p)}
            />
          ))}
        </div>
      )}

      {/* Modale fiche produit détaillée */}
      <ProductDetailModal
        product={activeProduct}
        primaryColor={shop.primary_color}
        isShopOpen={isShopOpen}
        onClose={() => setActiveProduct(null)}
      />

      {/* Tiroir Panier */}
      <CartDrawer
        slug={shop.slug}
        primaryColor={shop.primary_color}
        isShopOpen={isShopOpen}
      />

      {/* Bouton flottant mobile (uniquement si la boutique est ouverte) */}
      {isShopOpen && <FloatingCartButton primaryColor={shop.primary_color} />}
    </div>
  );
}
