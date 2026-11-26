"use client";

import Image from "next/image";
import Link from "next/link";
import {
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Store,
  BadgeCheck,
  MessageCircle,
} from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useExplorerCart, type ExplorerCartItem } from "@/lib/cart/explorer-cart-context";

export function ExplorerCartDrawer() {
  const {
    items,
    itemCount,
    subtotal,
    updateQuantity,
    removeItem,
    clearCart,
    clearShopItems,
    checkoutShop,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
  } = useExplorerCart();

  if (!isCartDrawerOpen) return null;

  // Grouper les articles par boutique
  const groupedByShop = items.reduce<Record<string, ExplorerCartItem[]>>((acc, item) => {
    if (!acc[item.shopId]) {
      acc[item.shopId] = [];
    }
    acc[item.shopId].push(item);
    return acc;
  }, {});

  const shopIds = Object.keys(groupedByShop);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-lg h-[90vh] sm:h-auto sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl border border-line bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* En-tête du panier */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-sand/30">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <ShoppingBag className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-ink">
                Mon Panier Explorer
              </h2>
              <p className="text-xs text-muted">
                {itemCount} article{itemCount > 1 ? "s" : ""}{" "}
                {shopIds.length > 1 ? `· ${shopIds.length} boutiques` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(false)}
            className="grid size-9 place-items-center rounded-full text-muted hover:bg-sand transition-colors cursor-pointer"
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
              Explorez les pépites du moment et cliquez sur « Ajouter » pour préparer vos commandes.
            </p>
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(false)}
              className="mt-5 rounded-2xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition-colors"
            >
              Découvrir les produits
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
              {shopIds.map((shopId) => {
                const shopItems = groupedByShop[shopId];
                const firstItem = shopItems[0];
                const shopSubtotal = shopItems.reduce(
                  (sum, it) => sum + it.price * it.quantity,
                  0
                );
                const shopCount = shopItems.reduce((sum, it) => sum + it.quantity, 0);

                return (
                  <div
                    key={shopId}
                    className="rounded-2xl border border-line bg-sand/20 p-3.5 flex flex-col gap-3"
                  >
                    {/* En-tête de la boutique */}
                    <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
                      <Link
                        href={`/${firstItem.shopSlug}`}
                        onClick={() => setIsCartDrawerOpen(false)}
                        className="inline-flex items-center gap-1.5 hover:text-brand-700 transition-colors min-w-0"
                      >
                        <Store className="size-4 shrink-0 text-brand-600" />
                        <span className="font-extrabold text-xs sm:text-sm text-ink truncate">
                          {firstItem.shopName}
                        </span>
                        {firstItem.shopIsCertified && (
                          <BadgeCheck className="size-3.5 fill-blue-600 text-white shrink-0" />
                        )}
                      </Link>

                      <button
                        type="button"
                        onClick={() => clearShopItems(shopId)}
                        className="text-[11px] text-muted hover:text-danger-600 transition-colors"
                        title="Vider les articles de cette boutique"
                      >
                        Vider
                      </button>
                    </div>

                    {/* Liste des articles de cette boutique */}
                    <div className="flex flex-col divide-y divide-line/60">
                      {shopItems.map((item) => (
                        <div
                          key={item.productId}
                          className="py-2.5 flex items-center gap-3 first:pt-0 last:pb-0"
                        >
                          {/* Miniature photo */}
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-line bg-white">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-muted font-bold text-[10px]">
                                IMG
                              </div>
                            )}
                          </div>

                          {/* Infos produit */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-ink">
                              {item.name}
                            </p>
                            <p className="text-xs font-extrabold text-brand-700 mt-0.5">
                              {formatFCFA(item.price)}
                            </p>
                          </div>

                          {/* Sélecteur de quantité & suppression */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center rounded-xl border border-line bg-white p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.productId, item.quantity - 1)
                                }
                                className="grid size-6 place-items-center rounded-lg hover:bg-sand text-ink text-xs transition-colors"
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.productId, item.quantity + 1)
                                }
                                className="grid size-6 place-items-center rounded-lg hover:bg-sand text-ink text-xs transition-colors"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.productId)}
                              className="text-muted hover:text-danger-600 p-1 transition-colors"
                              title="Retirer cet article"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Sous-total et Bouton Commander pour cette boutique */}
                    <div className="mt-1 flex items-center justify-between pt-2 border-t border-line/60">
                      <div>
                        <span className="text-[11px] text-muted">
                          Total ({shopCount} art.) :
                        </span>
                        <p className="font-black text-sm text-ink">
                          {formatFCFA(shopSubtotal)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => checkoutShop(shopId)}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs active:scale-98 transition-all"
                      >
                        <MessageCircle className="size-3.5" />
                        <span>Commander sur WhatsApp</span>
                        <ArrowRight className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pied du tiroir : Récapitulatif global */}
            <div className="border-t border-line bg-white p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted font-semibold">Total général</span>
                <span className="font-extrabold text-base sm:text-lg text-ink">
                  {formatFCFA(subtotal)}
                </span>
              </div>
              <p className="text-[11px] text-muted text-center">
                Chaque commande est finalisée directement avec le commerçant via son WhatsApp officiel.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearCart}
                  className="rounded-2xl border border-line px-3.5 py-2.5 text-xs font-semibold text-muted hover:text-danger-600 transition-colors cursor-pointer"
                >
                  Tout vider
                </button>

                <button
                  type="button"
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="flex-1 rounded-2xl bg-brand-50 border border-brand-200 py-2.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors"
                >
                  Continuer à explorer
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
