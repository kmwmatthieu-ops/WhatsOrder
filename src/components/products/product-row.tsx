"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageIcon, Layers } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { Toggle } from "@/components/ui/toggle";
import { toggleProductAvailability } from "@/app/tableau-de-bord/produits/actions";
import type { ProductWithVariants } from "@/types/database";

export function ProductRow({ product }: { product: ProductWithVariants }) {
  const [isAvailable, setIsAvailable] = useState(product.is_available);
  const [, startTransition] = useTransition();

  const coverImage = product.images?.[0];
  const variants = product.product_variants ?? [];

  function handleToggle(checked: boolean) {
    setIsAvailable(checked);
    startTransition(async () => {
      const res = await toggleProductAvailability(product.id, checked);
      if (res.error) {
        setIsAvailable(!checked);
      }
    });
  }

  let stockText = product.stock !== null ? `${product.stock} en stock` : "Stock illimité";
  if (variants.length > 0) {
    const hasUnlimited = variants.some((v) => v.is_available && v.stock === null);
    const totalStock = variants
      .filter((v) => v.is_available && v.stock !== null)
      .reduce((acc, v) => acc + (v.stock ?? 0), 0);
    stockText = hasUnlimited
      ? `${variants.length} variante${variants.length > 1 ? "s" : ""} • Stock illimité`
      : `${variants.length} variante${variants.length > 1 ? "s" : ""} • ${totalStock} en stock`;
  }

  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-white p-3.5 shadow-xs transition-colors hover:border-brand-500/50">
      {/* Vignette avec lazy loading */}
      <Link
        href={`/tableau-de-bord/produits/${product.id}`}
        className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-line bg-sand"
      >
        {coverImage ? (
          <Image
            src={coverImage}
            alt={product.name}
            fill
            sizes="64px"
            loading="lazy"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted">
            <ImageIcon className="size-6" aria-hidden />
          </div>
        )}
      </Link>

      {/* Informations produit */}
      <Link href={`/tableau-de-bord/produits/${product.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{product.name}</p>
        <p className="font-semibold text-brand-600 text-sm">{formatFCFA(product.price)}</p>
        <p className="text-xs text-muted inline-flex items-center gap-1">
          {variants.length > 0 && <Layers className="size-3 text-brand-600 shrink-0" />}
          <span>{stockText}</span>
        </p>
      </Link>

      {/* Bascule disponibilité rapide */}
      <div className="shrink-0 flex flex-col items-end">
        <Toggle
          checked={isAvailable}
          onChange={handleToggle}
          label={isAvailable ? "Disponible" : "Épuisé"}
          hideLabel
        />
        <span className="text-[11px] font-medium text-muted mt-0.5">
          {isAvailable ? "En vente" : "Caché"}
        </span>
      </div>
    </div>
  );
}
