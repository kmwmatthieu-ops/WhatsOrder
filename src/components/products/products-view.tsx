"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FolderCog, Search, PackageOpen } from "lucide-react";
import { ProductRow } from "@/components/products/product-row";
import { CategoryManager } from "@/components/products/category-manager";
import { LimitBanner } from "@/components/products/limit-banner";
import { PRODUCT_LIMIT } from "@/lib/constants";
import type { Category, ProductWithVariants } from "@/types/database";

export function ProductsView({
  products,
  categories,
}: {
  products: ProductWithVariants[];
  categories: Category[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const productCount = products.length;
  const isLimitReached = productCount >= PRODUCT_LIMIT;

  // Filtrage combiné : catégorie + recherche textuelle
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
    <div className="flex flex-col gap-5">
      {/* En-tête : Titre, compteur, bouton Ajouter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-ink">Produits</h1>
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-bold text-muted">
              {productCount} / {PRODUCT_LIMIT}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Gérez votre catalogue de vente WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-white px-3.5 text-sm font-semibold text-ink shadow-xs hover:bg-sand transition-colors"
          >
            <FolderCog className="size-4" />
            <span className="hidden sm:inline">Catégories</span>
          </button>

          {isLimitReached ? (
            <button
              type="button"
              disabled
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-muted/30 px-4 text-sm font-semibold text-muted cursor-not-allowed"
              title="Limite de 20 produits atteinte"
            >
              <Plus className="size-4" />
              <span>Ajouter un produit</span>
            </button>
          ) : (
            <Link
              href="/tableau-de-bord/produits/nouveau"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
            >
              <Plus className="size-4" />
              <span>Ajouter un produit</span>
            </Link>
          )}
        </div>
      </div>

      {/* Bannière limite 20 produits */}
      <LimitBanner currentCount={productCount} maxLimit={PRODUCT_LIMIT} />

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" aria-hidden />
        <input
          type="search"
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-2xl border border-line bg-white pl-10 pr-4 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {/* Filtres par catégories (onglets horizontaux avec défilement) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            selectedCategory === "all"
              ? "bg-brand-600 text-white"
              : "bg-white text-ink border border-line hover:bg-sand"
          }`}
        >
          Tous ({products.length})
        </button>
        {categories.map((c) => {
          const count = products.filter((p) => p.category_id === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                selectedCategory === c.id
                  ? "bg-brand-600 text-white"
                  : "bg-white text-ink border border-line hover:bg-sand"
              }`}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Liste des produits */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-white p-8 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-sand text-muted mb-3">
            <PackageOpen className="size-6" />
          </div>
          <p className="font-bold text-ink text-sm">Aucun produit trouvé</p>
          <p className="text-xs text-muted mt-1 max-w-xs">
            {search
              ? "Modifiez votre recherche ou réinitialisez les filtres."
              : "Ajoutez votre premier produit pour commencer à vendre."}
          </p>
          {!isLimitReached && !search && (
            <Link
              href="/tableau-de-bord/produits/nouveau"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-bold text-white shadow-sm"
            >
              <Plus className="size-4" />
              Ajouter un produit
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredProducts.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Modal / tiroir de gestion des catégories */}
      <CategoryManager
        categories={categories}
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
      />
    </div>
  );
}
