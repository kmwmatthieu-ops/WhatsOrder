"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

interface CategoryOption {
  name: string;
  count?: number;
}

interface ExplorerSearchProps {
  categories: CategoryOption[];
  currentQuery?: string;
  currentCategory?: string;
}

export function ExplorerSearch({
  categories,
  currentQuery = "",
  currentCategory = "",
}: ExplorerSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    startTransition(() => {
      router.push(`/explorer?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("q") as HTMLInputElement;
    updateFilter("q", input.value.trim());
  }

  function handleCategoryClick(catName: string) {
    if (currentCategory === catName) {
      updateFilter("cat", "");
    } else {
      updateFilter("cat", catName);
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* Barre de recherche principale */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
        <input
          type="search"
          name="q"
          defaultValue={currentQuery}
          placeholder="Rechercher un produit, une marque, une boutique..."
          className="w-full h-12 rounded-2xl border border-line bg-white pl-11 pr-11 text-sm text-ink placeholder:text-muted focus:border-brand-600 focus:outline-none shadow-xs"
        />
        {currentQuery && (
          <button
            type="button"
            onClick={() => updateFilter("q", "")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1"
            title="Effacer la recherche"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      {/* Filtres par Catégories (Pilules défilantes) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => updateFilter("cat", "")}
          className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            !currentCategory
              ? "bg-brand-600 text-white shadow-xs"
              : "border border-line bg-white text-ink hover:bg-sand/60"
          }`}
        >
          Tous les produits
        </button>

        {categories.map((cat) => {
          const isActive = currentCategory.toLowerCase() === cat.name.toLowerCase();
          return (
            <button
              key={cat.name}
              type="button"
              onClick={() => handleCategoryClick(cat.name)}
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

      {isPending && (
        <div className="h-0.5 w-full bg-brand-100 overflow-hidden">
          <div className="h-full w-1/3 bg-brand-600 animate-indeterminate" />
        </div>
      )}
    </div>
  );
}
