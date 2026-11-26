"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { ExplorerProduct } from "@/types/database";

export interface ExplorerCartItem {
  productId: string;
  name: string;
  price: number;
  originalPrice: number;
  imageUrl: string | null;
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopIsCertified: boolean;
  quantity: number;
  maxStock: number | null;
}

interface ExplorerCartContextType {
  items: ExplorerCartItem[];
  itemCount: number;
  subtotal: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  addItem: (product: ExplorerProduct, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  clearShopItems: (shopId: string) => void;
  checkoutShop: (shopId: string) => void;
}

const STORAGE_KEY = "wo-explorer-cart";

const ExplorerCartContext = createContext<ExplorerCartContextType | null>(null);

export function ExplorerCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ExplorerCartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Charger depuis localStorage au montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      /* ignore */
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Sauvegarder dans localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, isInitialized]);

  const addItem = useCallback((product: ExplorerProduct, quantity = 1) => {
    const hasDiscount = (product.product_discount_percent ?? 0) > 0;
    const finalPrice = hasDiscount
      ? Math.max(1, Math.round(product.product_price * (100 - product.product_discount_percent) / 100))
      : product.product_price;

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === product.product_id);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const newQty = existing.quantity + quantity;
        const cappedQty =
          existing.maxStock !== null ? Math.min(newQty, existing.maxStock) : newQty;

        const updated = [...prev];
        updated[existingIndex] = { ...existing, quantity: cappedQty };
        return updated;
      }

      return [
        ...prev,
        {
          productId: product.product_id,
          name: product.product_name,
          price: finalPrice,
          originalPrice: product.product_price,
          imageUrl: product.product_image_url,
          shopId: product.shop_id,
          shopName: product.shop_name,
          shopSlug: product.shop_slug,
          shopIsCertified: Boolean(product.shop_is_certified),
          quantity: product.product_stock !== null ? Math.min(quantity, product.product_stock) : quantity,
          maxStock: product.product_stock,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => i.productId !== productId);
      }
      return prev.map((item) => {
        if (item.productId === productId) {
          const capped =
            item.maxStock !== null ? Math.min(quantity, item.maxStock) : quantity;
          return { ...item, quantity: capped };
        }
        return item;
      });
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const clearShopItems = useCallback((shopId: string) => {
    setItems((prev) => prev.filter((i) => i.shopId !== shopId));
  }, []);

  const checkoutShop = useCallback(
    (shopId: string) => {
      const shopItems = items.filter((i) => i.shopId === shopId);
      if (shopItems.length === 0) return;

      const shopSlug = shopItems[0].shopSlug;

      // Synchroniser avec le panier de la boutique locale (wo-cart-{shopId})
      try {
        const shopCartItems = shopItems.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          originalPrice: i.originalPrice,
          imageUrl: i.imageUrl,
          quantity: i.quantity,
          maxStock: i.maxStock,
          variantId: null,
          selectedOptions: null,
        }));
        localStorage.setItem(`wo-cart-${shopId}`, JSON.stringify(shopCartItems));
      } catch {
        /* ignore */
      }

      // Rediriger vers la page de commande WhatsApp de cette boutique
      window.location.href = `/${shopSlug}/commande`;
    },
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  return (
    <ExplorerCartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        clearShopItems,
        checkoutShop,
      }}
    >
      {children}
    </ExplorerCartContext.Provider>
  );
}

export function useExplorerCart() {
  const context = useContext(ExplorerCartContext);
  if (!context) {
    throw new Error("useExplorerCart doit être utilisé dans un ExplorerCartProvider");
  }
  return context;
}
