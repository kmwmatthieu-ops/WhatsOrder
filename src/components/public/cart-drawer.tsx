"use client";

import Image from "next/image";
import Link from "next/link";
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Clock } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useCart } from "@/lib/cart/cart-context";

export function CartDrawer({
  slug,
  primaryColor,
  isShopOpen = true,
}: {
  slug: string;
  primaryColor: string;
  isShopOpen?: boolean;
}) {
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart, isCartDrawerOpen, setIsCartDrawerOpen } =
    useCart();

  if (!isCartDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md h-[88vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border border-line bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* En-tête du panier */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-5" style={{ color: primaryColor }} />
            <h2 className="text-base font-extrabold text-ink">
              Mon Panier ({itemCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(false)}
            className="grid size-9 place-items-center rounded-full text-muted hover:bg-sand"
            aria-label="Fermer le panier"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Contenu */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="grid size-16 place-items-center rounded-3xl bg-sand text-muted mb-3">
              <ShoppingBag className="size-8" />
            </div>
            <p className="font-bold text-ink text-base">Votre panier est vide</p>
            <p className="text-xs text-muted mt-1 max-w-xs">
              Explorez le catalogue et ajoutez des articles pour commencer votre commande.
            </p>
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(false)}
              className="mt-5 rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              Parcourir les produits
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col divide-y divide-line">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId ?? ""}-${item.selectedOptions ?? ""}`} className="py-3 flex items-center gap-3">
                  {/* Photo miniature */}
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-line bg-sand">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted font-bold text-xs">
                        IMG
                      </div>
                    )}
                  </div>

                  {/* Infos & Options */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-bold text-ink">{item.name}</p>
                    {item.selectedOptions && (
                      <p className="truncate text-[11px] text-muted italic">
                        {item.selectedOptions}
                      </p>
                    )}
                    <p className="text-xs font-extrabold mt-0.5" style={{ color: primaryColor }}>
                      {formatFCFA(item.price)}
                    </p>
                  </div>

                  {/* Quantité & Poubelle */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.selectedOptions, item.variantId)}
                      className="text-danger-600 hover:text-danger-700 p-1"
                      title="Retirer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>

                    <div className="flex items-center rounded-xl border border-line bg-sand/60 p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1, item.selectedOptions, item.variantId)}
                        className="grid size-6 place-items-center rounded-lg bg-white text-ink text-xs shadow-xs"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1, item.selectedOptions, item.variantId)}
                        className="grid size-6 place-items-center rounded-lg bg-white text-ink text-xs shadow-xs"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pied : Sous-total & Bouton Commander */}
            <div className="border-t border-line bg-white p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted font-semibold">Sous-total</span>
                <span className="font-extrabold text-base text-ink">{formatFCFA(subtotal)}</span>
              </div>
              <p className="text-[11px] text-muted text-center">
                Les frais de livraison éventuels sont calculés à l&apos;étape suivante.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearCart}
                  className="rounded-2xl border border-line px-3.5 py-3 text-xs font-semibold text-muted hover:text-danger-600"
                >
                  Vider
                </button>
                {isShopOpen ? (
                  <Link
                    href={`/${slug}/commande`}
                    onClick={() => setIsCartDrawerOpen(false)}
                    style={{ backgroundColor: primaryColor }}
                    className="flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl font-bold text-white shadow-md active:scale-98 transition-transform"
                  >
                    <span>Passer la commande</span>
                    <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl bg-gray-400 font-bold text-white cursor-not-allowed"
                  >
                    <Clock className="size-4" />
                    <span>Boutique fermée</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
