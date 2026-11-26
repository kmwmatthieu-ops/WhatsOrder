"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Store, Flag, ArrowUpRight, BadgeCheck, Plus, Check } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { ReportModal } from "@/components/shop/report-modal";
import { trackCustomerActivityAction } from "@/app/compte/actions";
import { useExplorerCart } from "@/lib/cart/explorer-cart-context";
import type { ExplorerProduct } from "@/types/database";

interface ExplorerCardProps {
  product: ExplorerProduct;
  isFollowing?: boolean;
}

export function ExplorerCard({ product }: ExplorerCardProps) {
  const [showReport, setShowReport] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const { addItem } = useExplorerCart();

  function handleTrackClick() {
    trackCustomerActivityAction(
      "click",
      product.product_id,
      product.shop_id,
      product.category_id
    ).catch(() => {});
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    addItem(product, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);

    trackCustomerActivityAction(
      "click",
      product.product_id,
      product.shop_id,
      product.category_id
    ).catch(() => {});
  }

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
          onClick={handleTrackClick}
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
            {/* Boutique d'origine & Actions discrètes (Drapeau au-dessus, Flèche en dessous) */}
            <div className="flex items-start justify-between gap-1 text-[11px] text-muted mb-1">
              <Link
                href={`/${product.shop_slug}`}
                className="inline-flex items-center gap-1 hover:text-brand-700 truncate min-w-0 flex-1 mr-1"
                title={product.shop_name}
              >
                <Store className="size-3 shrink-0 text-brand-600" />
                <span className="truncate font-semibold text-ink/80 group-hover:text-brand-700 transition-colors">
                  {product.shop_name}
                </span>
                {product.shop_is_certified && (
                  <span title="Boutique vérifiée" className="shrink-0">
                    <BadgeCheck className="size-3.5 fill-blue-600 text-white" />
                  </span>
                )}
              </Link>

              {/* Actions discrètes : Drapeau en haut, Flèche boutique juste en dessous */}
              <div className="flex flex-col items-center gap-1 shrink-0 -mt-0.5">
                {/* 1. Bouton de signalement discret */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowReport(true);
                  }}
                  className="hover:text-danger-600 text-muted p-0.5 transition-colors cursor-pointer"
                  title="Signaler ce produit"
                >
                  <Flag className="size-3" />
                </button>

                {/* 2. Bouton flèche boutique (identique au drapeau, sans encadrement) */}
                <Link
                  href={productShopUrl}
                  onClick={handleTrackClick}
                  className="hover:text-brand-700 text-muted p-0.5 transition-colors cursor-pointer"
                  title="Visiter la boutique"
                >
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>

            {/* Titre */}
            <Link
              href={productShopUrl}
              onClick={handleTrackClick}
              className="block group-hover:text-brand-700 transition-colors"
            >
              <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-ink leading-snug">
                {product.product_name}
              </h3>
            </Link>
          </div>

          {/* Prix & Bouton Ajouter au panier */}
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

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className={`inline-flex items-center gap-1 rounded-2xl px-3 py-1.5 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
                isAdded
                  ? "bg-emerald-600 text-white scale-105"
                  : "bg-brand-600 text-white hover:bg-brand-700"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={isOutOfStock ? "Rupture de stock" : "Ajouter au panier"}
            >
              {isAdded ? (
                <>
                  <Check className="size-3.5 stroke-[3]" />
                  <span>Ajouté</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5 stroke-[3]" />
                  <span>Ajouter</span>
                </>
              )}
            </button>
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
