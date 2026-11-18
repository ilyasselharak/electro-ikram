"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ImageAsset } from "@/lib/cloudinary";

export const MAX_QTY = 20;

export type CartItem = {
  productId: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  sku: string;
  price: number;
  oldPrice?: number;
  image: ImageAsset | null;
  stock: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  couponCode: string | null;
  /** Returns the quantity actually in the cart after the operation. */
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => number;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setCoupon: (code: string | null) => void;
  /** Syncs prices/stock with fresh server data; drops unavailable products. */
  sync: (fresh: { _id: string; price: number; oldPrice?: number; stock: number; nameFr: string; nameAr: string; image: ImageAsset | null }[], requestedIds: string[]) => void;
};

const limit = (qty: number, stock: number) => Math.max(0, Math.min(qty, stock, MAX_QTY));

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      add: (item, quantity = 1) => {
        const existing = get().items.find((i) => i.productId === item.productId);
        const target = limit((existing?.quantity ?? 0) + quantity, item.stock);
        if (target <= 0) return existing?.quantity ?? 0;
        set((s) => ({
          items: existing
            ? s.items.map((i) => (i.productId === item.productId ? { ...i, ...item, quantity: target } : i))
            : [...s.items, { ...item, quantity: target }],
        }));
        return target;
      },
      setQuantity: (productId, quantity) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.productId === productId ? { ...i, quantity: limit(quantity, i.stock) } : i))
            .filter((i) => i.quantity > 0),
        })),
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [], couponCode: null }),
      setCoupon: (couponCode) => set({ couponCode }),
      sync: (fresh, requestedIds) => {
        const map = new Map(fresh.map((p) => [p._id, p]));
        const requested = new Set(requestedIds);
        const current = get().items;
        let changed = false;
        const next = current.flatMap((i) => {
          if (!requested.has(i.productId)) return [i];
          const p = map.get(i.productId);
          if (!p || p.stock <= 0) {
            changed = true;
            return [];
          }
          const quantity = limit(i.quantity, p.stock);
          if (quantity !== i.quantity || p.price !== i.price || p.stock !== i.stock || p.oldPrice !== i.oldPrice) changed = true;
          return [{ ...i, price: p.price, oldPrice: p.oldPrice, stock: p.stock, nameFr: p.nameFr, nameAr: p.nameAr, image: p.image, quantity }];
        });
        if (changed) set({ items: next });
      },
    }),
    {
      name: "electro-ikram-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((s, i) => s + i.quantity, 0);
export const cartSubtotal = (items: CartItem[]) =>
  Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
