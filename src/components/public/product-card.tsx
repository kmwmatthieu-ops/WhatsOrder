"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import type { Product } from "@/types/database";

export function ProductCard({
  product,
  primaryColor,
  onClick,
}: {
  product: Product;
  primaryColor: string;
  onClick: () => void;
}) {
  const isOutOfStock = !product.is_available || product.stock === 0;
  const coverImage = product.images?.[0];

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
        ) : product.stock !== null && product.stock <= 5 ? (
          <span className="absolute left-2 top-2 rounded-md bg-accent-500/95 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
            Plus que {product.stock}
          </span>
        ) : null}
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-ink group-hover:text-brand-600 transition-colors">
          {product.name}
        </h3>

        {product.options_text && (
          <p className="mt-1 line-clamp-1 text-[11px] text-muted">
            {product.options_text}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-extrabold text-sm sm:text-base text-ink">
            {formatFCFA(product.price)}
          </span>

          <span
            className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition-transform active:scale-95"
            style={{ backgroundColor: isOutOfStock ? "#6b6f6a" : primaryColor }}
          >
            {isOutOfStock ? "Voir" : "+ Ajouter"}
          </span>
        </div>
      </div>
    </div>
  );
}
