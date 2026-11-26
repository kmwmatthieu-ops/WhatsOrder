"use client";

import { ShoppingBag } from "lucide-react";
import { useExplorerCart } from "@/lib/cart/explorer-cart-context";

export function ExplorerHeaderCartButton() {
  const { itemCount, setIsCartDrawerOpen } = useExplorerCart();

  return (
    <button
      type="button"
      onClick={() => setIsCartDrawerOpen(true)}
      className="relative inline-flex items-center gap-1.5 rounded-2xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-sand transition-colors shadow-xs cursor-pointer"
      title="Voir mon panier Explorer"
    >
      <ShoppingBag className="size-4 text-brand-600" />
      <span className="hidden sm:inline">Panier</span>
      {itemCount > 0 && (
        <span className="grid size-5 place-items-center rounded-full bg-accent-500 text-[10px] font-black text-white shadow-xs animate-in zoom-in">
          {itemCount}
        </span>
      )}
    </button>
  );
}
