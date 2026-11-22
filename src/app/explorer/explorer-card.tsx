"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Store, Flag, ArrowUpRight, BadgeCheck } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { ReportModal } from "@/components/shop/report-modal";
import type { ExplorerProduct } from "@/types/database";

interface ExplorerCardProps {
  product: ExplorerProduct;
}

export function ExplorerCard({ product }: ExplorerCardProps) {
  const [showReport, setShowReport] = useState(false);

  const hasDiscount = (product.product_discount_percent ?? 0) > 0;
  const discountedPrice = hasDiscount
    ? Math.max(1, Math.round(product.product_price * (100 - product.product_discount_percent) / 100))
    : product.product_price;

  const isOutOfStock = product.product_stock !== null && product.product_stock <= 0;
  const productShopUrl = `/${product.shop_slug}?produit=${product.product_id}`;

  return (
    <>
      <div className="group relative flex flex-col rounded-3xl border border-line bg-white p-3 shadow-xs hover:border-brand-600 hover:shadow-md transition-all">
        {/* Zone Image */}
        <Link
          href={productShopUrl}
          className="relative aspect-square w-full overflow-hidden rounded-2xl bg-sand/60 block"
        >
          {product.product_image_url ? (
            <Image
              src={product.product_image_url}
              alt={product.product_name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted text-xs">
              Pas d&apos;image
            </div>
          )}

          {/* Badges promo / rupture */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {hasDiscount && (
              <span className="rounded-xl bg-danger-600 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                -{product.product_discount_percent}%
              </span>
            )}
            {isOutOfStock && (
              <span className="rounded-xl bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                Rupture
              </span>
            )}
          </div>
        </Link>

        {/* Détails du produit */}
        <div className="flex flex-1 flex-col justify-between pt-3">
          <div>
            {/* Boutique d'origine */}
            <div className="flex items-center justify-between gap-1 text-[11px] text-muted mb-1">
              <Link
                href={`/${product.shop_slug}`}
                className="inline-flex items-center gap-1 hover:text-brand-700 truncate max-w-[140px]"
                title={product.shop_name}
              >
                <Store className="size-3 shrink-0 text-brand-600" />
                <span className="truncate font-medium">{product.shop_name}</span>
                {product.shop_is_certified && (
                  <span title="Boutique certifiée">
                    <BadgeCheck className="size-3.5 fill-blue-600 text-white shrink-0" />
                  </span>
                )}
              </Link>

              {/* Bouton de signalement discret */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowReport(true);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-danger-600 text-muted p-1 transition-opacity"
                title="Signaler ce produit"
              >
                <Flag className="size-3" />
              </button>
            </div>

            {/* Titre */}
            <Link href={productShopUrl} className="block group-hover:text-brand-700 transition-colors">
              <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-ink leading-snug">
                {product.product_name}
              </h3>
            </Link>
          </div>

          {/* Prix & Action */}
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-line/60">
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold text-ink">
                {formatFCFA(discountedPrice)}
              </span>
              {hasDiscount && (
                <span className="text-[10px] text-muted line-through">
                  {formatFCFA(product.product_price)}
                </span>
              )}
            </div>

            <Link
              href={productShopUrl}
              className="grid size-8 place-items-center rounded-xl bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white transition-all shadow-xs"
              title="Voir dans la boutique"
            >
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetType="product"
        targetName={product.product_name}
        shopId={product.shop_id}
        productId={product.product_id}
      />
    </>
  );
}
