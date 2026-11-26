"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { X, Minus, Plus, ShoppingBag, ImageIcon, Clock, Check, Store, BadgeCheck, Layers } from "lucide-react";
import { applyDiscount, formatFCFA } from "@/lib/format";
import { useCart } from "@/lib/cart/cart-context";
import type { ProductWithVariants, ProductVariant } from "@/types/database";

type Dimension = {
  name: string;
  values: string[];
};

function getVariantAttributes(v: ProductVariant): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (v.attributes && typeof v.attributes === "object") {
    for (const [k, val] of Object.entries(v.attributes as Record<string, unknown>)) {
      if (typeof val === "string" && val.trim()) {
        attrs[k.trim()] = val.trim();
      }
    }
  }

  // Si attributes n'a pas plusieurs clés mais le label contient un séparateur " / "
  if (Object.keys(attrs).length < 2 && v.label.includes(" / ")) {
    const parts = v.label.split(" / ").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      if (!attrs["Capacité / Modèle"]) attrs["Capacité / Modèle"] = parts[0];
      if (!attrs["Couleur"]) attrs["Couleur"] = parts[1];
      if (parts.length >= 3 && !attrs["Option"]) attrs["Option"] = parts[2];
    }
  }

  // Fallback si toujours vide
  if (Object.keys(attrs).length === 0) {
    attrs["Option"] = v.label.trim();
  }

  return attrs;
}

export function ProductDetailModal({
  product,
  primaryColor,
  isShopOpen = true,
  shopName,
  shopIsCertified = false,
  onClose,
}: {
  product: ProductWithVariants | null;
  primaryColor: string;
  isShopOpen?: boolean;
  shopName?: string;
  shopIsCertified?: boolean;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [optionsNote, setOptionsNote] = useState("");

  const variants = product?.product_variants ?? [];
  const hasVariants = variants.length > 0;
  const discountPct = product?.discount_percent ?? 0;

  // Extraction automatique des dimensions (lignes superposées : ex. Capacité, Couleur, Taille)
  const { dimensions, variantAttrMap } = useMemo(() => {
    const map = new Map<string, Record<string, string>>();
    const dimKeys: string[] = [];
    const dimValuesMap: Record<string, Set<string>> = {};

    for (const v of variants) {
      const attrs = getVariantAttributes(v);
      map.set(v.id, attrs);
      for (const [k, val] of Object.entries(attrs)) {
        if (!dimValuesMap[k]) {
          dimValuesMap[k] = new Set();
          dimKeys.push(k);
        }
        dimValuesMap[k].add(val);
      }
    }

    const dims: Dimension[] = dimKeys.map((k) => ({
      name: k,
      values: Array.from(dimValuesMap[k]),
    }));

    return { dimensions: dims, variantAttrMap: map };
  }, [variants]);

  // À chaque ouverture d'un produit, pré-sélectionner la première variante disponible
  useEffect(() => {
    if (!product) return;
    setSelectedPhotoIndex(0);
    setQuantity(1);
    setOptionsNote("");

    const prodVariants = product.product_variants ?? [];
    if (prodVariants.length > 0) {
      const firstAvail =
        prodVariants.find(
          (v) => v.is_available && (v.stock === null || v.stock > 0)
        ) || prodVariants[0];

      if (firstAvail) {
        setSelectedVariantId(firstAvail.id);
        const attrs = getVariantAttributes(firstAvail);
        setSelectedOptions(attrs);
      }
    } else {
      setSelectedVariantId(null);
      setSelectedOptions({});
    }
  }, [product]);

  if (!product) return null;

  const selectedVariant = hasVariants
    ? variants.find((v) => v.id === selectedVariantId) ?? null
    : null;

  const isVariantExhausted = (v: (typeof variants)[number]) =>
    !v.is_available || v.stock === 0;

  const isOutOfStock = hasVariants
    ? !product.is_available || variants.every(isVariantExhausted)
    : !product.is_available || product.stock === 0;

  const basePrice = selectedVariant?.price_override ?? product.price;
  const activePrice = applyDiscount(basePrice, discountPct);
  const activeStock = hasVariants ? (selectedVariant ? selectedVariant.stock : 0) : product.stock;
  const maxAvailable = activeStock ?? 999;

  const cannotOrder =
    isOutOfStock ||
    !isShopOpen ||
    (hasVariants && (!selectedVariant || isVariantExhausted(selectedVariant)));

  const images = product.images ?? [];
  const activeImage = images[selectedPhotoIndex];

  function handleSelectVariant(variantId: string) {
    const target = variants.find((v) => v.id === variantId);
    if (!target || isVariantExhausted(target)) return;
    setSelectedVariantId(variantId);
    if (target.stock !== null && quantity > target.stock) {
      setQuantity(Math.max(1, target.stock));
    }
  }

  function handleAddToCart() {
    if (cannotOrder || !product) return;

    if (hasVariants && selectedVariant) {
      addItem(
        {
          productId: product.id,
          variantId: selectedVariant.id,
          name: product.name,
          price: activePrice,
          imageUrl: images[0] ?? null,
          maxStock: selectedVariant.stock,
          selectedOptions: selectedVariant.label,
        },
        quantity
      );
      onClose();
      return;
    }

    addItem(
      {
        productId: product.id,
        variantId: null,
        name: product.name,
        price: activePrice,
        imageUrl: images[0] ?? null,
        maxStock: product.stock,
        selectedOptions: optionsNote.trim() ? optionsNote.trim() : null,
      },
      quantity
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-line bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Bouton fermer */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur-xs hover:bg-white"
          aria-label="Fermer"
        >
          <X className="size-5" />
        </button>

        {/* Zone défilante */}
        <div className="flex-1 overflow-y-auto">
          {/* Photos */}
          <div className="relative aspect-4/3 w-full bg-sand">
            {activeImage ? (
              <Image
                src={activeImage}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, 500px"
                className="object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted">
                <ImageIcon className="size-12" aria-hidden />
              </div>
            )}

            {discountPct > 0 && !isOutOfStock && (
              <span className="absolute left-3.5 top-3.5 rounded-xl bg-danger-600 px-3 py-1 text-xs font-black text-white shadow-md">
                Réduction -{discountPct}%
              </span>
            )}

            {isOutOfStock && (
              <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-xs">
                <span className="rounded-xl bg-danger-600 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white">
                  Épuisé
                </span>
              </div>
            )}
          </div>

          {/* Miniatures si plusieurs photos */}
          {images.length > 1 && (
            <div className="flex gap-2 p-3 bg-cream/50 overflow-x-auto border-b border-line">
              {images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setSelectedPhotoIndex(i)}
                  className={`relative size-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    selectedPhotoIndex === i ? "border-brand-600 scale-105" : "border-line opacity-70"
                  }`}
                >
                  <Image src={img} alt={`Miniature ${i + 1}`} fill sizes="56px" className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Détails du produit */}
          <div className="p-5 flex flex-col gap-4">
            <div>
              {shopName && (
                <div className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                  <Store className="size-3.5 text-brand-600 shrink-0" />
                  <span className="font-semibold text-ink/90">{shopName}</span>
                  {shopIsCertified && (
                    <span title="Boutique vérifiée" className="inline-flex items-center shrink-0">
                      <BadgeCheck className="size-3.5 fill-blue-600 text-white" />
                    </span>
                  )}
                </div>
              )}
              <h2 className="text-lg sm:text-xl font-extrabold text-ink">{product.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="font-extrabold text-xl" style={{ color: primaryColor }}>
                  {formatFCFA(activePrice)}
                </p>
                {discountPct > 0 && (
                  <>
                    <span className="text-sm font-semibold text-muted line-through">
                      {formatFCFA(basePrice)}
                    </span>
                    <span className="rounded-lg bg-danger-50 border border-danger-200 px-2 py-0.5 text-xs font-extrabold text-danger-700">
                      -{discountPct}%
                    </span>
                  </>
                )}
              </div>
              {activeStock !== null && (
                <p className="text-xs text-muted mt-1">
                  {activeStock > 0 ? `${activeStock} disponible${activeStock > 1 ? "s" : ""} en stock` : "Rupture de stock"}
                </p>
              )}
            </div>

            {product.description && (
              <div className="border-t border-line pt-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Description</h4>
                <p className="mt-1 text-sm text-ink/80 whitespace-pre-line leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Sélecteur de variantes structurées (V2-C) */}
            {hasVariants && (
              <div className="border-t border-line pt-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Choisissez votre variante
                  </h4>
                  {selectedVariant && (
                    <span className="text-xs font-extrabold text-ink">
                      {selectedVariant.label}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const exhausted = isVariantExhausted(v);
                    const isSelected = selectedVariantId === v.id && !exhausted;
                    const vBasePrice = v.price_override ?? product.price;
                    const vFinalPrice = applyDiscount(vBasePrice, discountPct);
                    const hasCustomPrice = v.price_override !== null && v.price_override !== product.price;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={exhausted}
                        onClick={() => handleSelectVariant(v.id)}
                        className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all ${
                          exhausted
                            ? "border-line bg-sand/50 text-muted line-through opacity-55 cursor-not-allowed"
                            : isSelected
                              ? "text-white shadow-sm scale-[1.02]"
                              : "border-line bg-white text-ink hover:bg-sand/50 cursor-pointer"
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: primaryColor, borderColor: primaryColor }
                            : undefined
                        }
                      >
                        {isSelected && <Check className="size-3.5 stroke-[3] shrink-0" />}
                        <span>{v.label}</span>
                        {hasCustomPrice && !exhausted && (
                          <span className={`text-[11px] ${isSelected ? "opacity-90" : "text-muted"}`}>
                            ({formatFCFA(vFinalPrice)})
                          </span>
                        )}
                        {exhausted && (
                          <span className="text-[10px] font-semibold no-underline">(Épuisé)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rétrocompatibilité si un ancien produit avait encore options_text sans variantes */}
            {!hasVariants && product.options_text && isShopOpen && !isOutOfStock && (
              <div className="border-t border-line pt-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Options proposées</h4>
                <p className="mt-1 text-xs text-brand-700 bg-brand-50 p-2.5 rounded-xl border border-brand-100">
                  {product.options_text}
                </p>

                <div className="mt-2.5">
                  <label htmlFor="options-note" className="text-xs font-semibold text-ink">
                    Précisez votre choix (taille, couleur…)
                  </label>
                  <input
                    id="options-note"
                    type="text"
                    value={optionsNote}
                    onChange={(e) => setOptionsNote(e.target.value)}
                    placeholder="Ex: Taille L, Couleur Noire"
                    maxLength={300}
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pied : Quantité & Bouton Ajouter (sans répétition du prix) */}
        <div className="border-t border-line bg-white p-4 flex items-center gap-3">
          {!cannotOrder && (
            <div className="flex items-center rounded-2xl border border-line bg-sand/60 p-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="grid size-9 place-items-center rounded-xl bg-white text-ink shadow-xs disabled:opacity-40"
                aria-label="Diminuer la quantité"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center text-sm font-bold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxAvailable, q + 1))}
                disabled={quantity >= maxAvailable}
                className="grid size-9 place-items-center rounded-xl bg-white text-ink shadow-xs disabled:opacity-40"
                aria-label="Augmenter la quantité"
              >
                <Plus className="size-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={cannotOrder}
            onClick={handleAddToCart}
            style={{ backgroundColor: cannotOrder ? "#9ca3af" : primaryColor }}
            className="flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl font-bold text-white shadow-md active:scale-98 transition-transform disabled:cursor-not-allowed"
          >
            {!isShopOpen ? (
              <>
                <Clock className="size-5 shrink-0" />
                <span>Boutique fermée</span>
              </>
            ) : isOutOfStock ? (
              <>
                <ShoppingBag className="size-5 shrink-0" />
                <span>Produit épuisé</span>
              </>
            ) : hasVariants && !selectedVariant ? (
              <>
                <ShoppingBag className="size-5 shrink-0" />
                <span>Choisissez une variante</span>
              </>
            ) : (
              <>
                <ShoppingBag className="size-5 shrink-0" />
                <span>Ajouter</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
