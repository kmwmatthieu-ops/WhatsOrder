"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Minus, Plus, ShoppingBag, ImageIcon } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useCart } from "@/lib/cart/cart-context";
import type { Product } from "@/types/database";

export function ProductDetailModal({
  product,
  primaryColor,
  onClose,
}: {
  product: Product | null;
  primaryColor: string;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [optionsNote, setOptionsNote] = useState("");

  if (!product) return null;

  const isOutOfStock = !product.is_available || product.stock === 0;
  const maxAvailable = product.stock ?? 999;
  const images = product.images ?? [];
  const activeImage = images[selectedPhotoIndex];

  function handleAddToCart() {
    if (isOutOfStock || !product) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
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
              <h2 className="text-lg sm:text-xl font-extrabold text-ink">{product.name}</h2>
              <p className="mt-1 font-extrabold text-xl" style={{ color: primaryColor }}>
                {formatFCFA(product.price)}
              </p>
              {product.stock !== null && (
                <p className="text-xs text-muted mt-1">
                  {product.stock > 0 ? `${product.stock} disponibles en stock` : "Rupture de stock"}
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

            {product.options_text && (
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

        {/* Pied : Quantité & Bouton Ajouter */}
        <div className="border-t border-line bg-white p-4 flex items-center gap-3">
          {!isOutOfStock && (
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
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            style={{ backgroundColor: isOutOfStock ? "#9ca3af" : primaryColor }}
            className="flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl font-bold text-white shadow-md active:scale-98 transition-transform disabled:cursor-not-allowed"
          >
            <ShoppingBag className="size-5" />
            {isOutOfStock ? "Produit épuisé" : `Ajouter • ${formatFCFA(product.price * quantity)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
