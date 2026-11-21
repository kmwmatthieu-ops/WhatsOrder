"use client";

import Image from "next/image";
import { ImageIcon, Plus } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import type { ProductWithVariants } from "@/types/database";

export function ProductCard({
  product,
  primaryColor,
  isShopOpen = true,
  onClick,
}: {
  product: ProductWithVariants;
  primaryColor: string;
  isShopOpen?: boolean;
  onClick: () => void;
}) {
  const variants = product.product_variants ?? [];
  const hasVariants = variants.length > 0;

  const availableVariants = variants.filter((v) => v.is_available && (v.stock === null || v.stock > 0));

  const isOutOfStock = hasVariants
    ? !product.is_available || availableVariants.length === 0
    : !product.is_available || product.stock === 0;

  const isDisabled = isOutOfStock || !isShopOpen;
  const coverImage = product.images?.[0];

  // Stock total restant pour le badge "Plus que X"
  let effectiveLowStock: number | null = null;
  if (!isOutOfStock) {
    if (hasVariants) {
      const hasUnlimited = availableVariants.some((v) => v.stock === null);
      if (!hasUnlimited) {
        const sum = availableVariants.reduce((acc, v) => acc + (v.stock ?? 0), 0);
        if (sum > 0 && sum <= 5) effectiveLowStock = sum;
      }
    } else if (product.stock !== null && product.stock > 0 && product.stock <= 5) {
      effectiveLowStock = product.stock;
    }
  }

  // Prix affiché (si variantes avec prix différents, on affiche le prix minimum)
  const prices = hasVariants
    ? variants.map((v) => v.price_override ?? product.price)
    : [product.price];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const hasMultiplePrices = minPrice !== maxPrice;

  const variantSummary = hasVariants
    ? variants.map((v) => v.label).join(" • ")
    : product.options_text;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-xs transition-all hover:shadow-md cursor-pointer ${
        isOutOfStock ? "opacity-80" : ""
      }`}
    >
      {/* Vignette photo WebP */}
      <div className="relative aspect-square w-full overflow-hidden bg-sand">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted">
            <ImageIcon className="size-8" aria-hidden />
          </div>
        )}

        {isOutOfStock ? (
          <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-xs">
            <span className="rounded-lg bg-danger-600 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-sm">
              Épuisé
            </span>
          </div>
        ) : effectiveLowStock !== null ? (
          <span className="absolute left-2 top-2 rounded-md bg-accent-500/95 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
            Plus que {effectiveLowStock}
          </span>
        ) : null}
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-ink group-hover:text-brand-600 transition-colors leading-snug">
          {product.name}
        </h3>

        {variantSummary && (
          <p className="mt-1 line-clamp-1 text-[11px] text-muted">
            {variantSummary}
          </p>
        )}

        <div className="mt-auto pt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-extrabold text-sm sm:text-base text-ink leading-tight truncate">
            {hasMultiplePrices ? `Dès ${formatFCFA(minPrice)}` : formatFCFA(minPrice)}
          </span>

          <span
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-white whitespace-nowrap shadow-xs transition-transform active:scale-95"
            style={{ backgroundColor: isDisabled ? "#6b6f6a" : primaryColor }}
          >
            {isOutOfStock ? (
              "Voir"
            ) : !isShopOpen ? (
              "Fermé"
            ) : (
              <>
                <Plus className="size-3.5 stroke-[2.5] shrink-0" aria-hidden />
                <span>{hasVariants ? "Choisir" : "Ajouter"}</span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
