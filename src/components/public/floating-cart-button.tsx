"use client";

import { ShoppingBag, ArrowRight } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useCart } from "@/lib/cart/cart-context";

export function FloatingCartButton({ primaryColor }: { primaryColor: string }) {
  const { itemCount, subtotal, setIsCartDrawerOpen } = useCart();

  if (itemCount === 0) return null;

  return (
    <aside
      aria-label="Aperçu du panier flottant"
      className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg"
    >
      <button
        type="button"
        onClick={() => setIsCartDrawerOpen(true)}
        style={{ backgroundColor: primaryColor }}
        className="flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-white shadow-xl hover:opacity-95 active:scale-98 transition-transform"
      >
        <div className="flex items-center gap-3">
          <span className="relative grid size-8 place-items-center rounded-xl bg-white/20">
            <ShoppingBag className="size-4.5" />
            <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-accent-500 text-[10px] font-black text-white shadow-xs">
              {itemCount}
            </span>
          </span>
          <span className="font-bold text-sm">Voir mon panier</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm">{formatFCFA(subtotal)}</span>
          <ArrowRight className="size-4" />
        </div>
      </button>
    </aside>
  );
}
