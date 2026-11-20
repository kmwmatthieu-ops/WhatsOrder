"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { CartItem, CartState } from "./types";

type CartContextType = CartState & {
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number, options?: string | null) => void;
  removeItem: (productId: string, options?: string | null) => void;
  clearCart: () => void;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextType | null>(null);

function getStorageKey(shopId: string) {
  return `wo-cart-${shopId}`;
}

export function CartProvider({
  shopId,
  children,
}: {
  shopId: string;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Charger depuis le localStorage au montage côté client
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(shopId));
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      /* ignore localStorage errors */
    } finally {
      setIsInitialized(true);
    }
  }, [shopId]);

  // Persister dans le localStorage à chaque modification
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(getStorageKey(shopId), JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, isInitialized, shopId]);

  const addItem = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.productId === item.productId && (i.selectedOptions ?? "") === (item.selectedOptions ?? "")
      );

      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const newQty = existing.quantity + quantity;
        const cappedQty =
          existing.maxStock !== null ? Math.min(newQty, existing.maxStock) : newQty;

        const updated = [...prev];
        updated[existingIndex] = { ...existing, quantity: cappedQty };
        return updated;
      }

      const cappedQty = item.maxStock !== null ? Math.min(quantity, item.maxStock) : quantity;
      return [...prev, { ...item, quantity: cappedQty }];
    });
    setIsCartDrawerOpen(true);
  };

  const updateQuantity = (productId: string, quantity: number, options?: string | null) => {
    if (quantity <= 0) {
      removeItem(productId, options);
      return;
    }

    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId && (i.selectedOptions ?? "") === (options ?? "")) {
          const cappedQty = i.maxStock !== null ? Math.min(quantity, i.maxStock) : quantity;
          return { ...i, quantity: cappedQty };
        }
        return i;
      })
    );
  };

  const removeItem = (productId: string, options?: string | null) => {
    setItems((prev) =>
      prev.filter(
        (i) => !(i.productId === productId && (i.selectedOptions ?? "") === (options ?? ""))
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem(getStorageKey(shopId));
    } catch {
      /* ignore */
    }
  };

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans un CartProvider");
  return ctx;
}
