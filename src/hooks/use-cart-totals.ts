"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { cartSubtotal, useCart } from "@/stores/cart";
import { useStoreSettings } from "@/providers/store-settings";
import { useHydrated } from "./use-hydrated";

/**
 * Cart totals mirroring the server rules (orders.create re-computes everything).
 * Also keeps cart prices/stock in sync with live product data.
 */
export function useCartTotals() {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const couponCode = useCart((s) => s.couponCode);
  const sync = useCart((s) => s.sync);
  const settings = useStoreSettings();
  const ids = useMemo(() => items.map((i) => i.productId), [items]);
  const idsKey = ids.join(",");

  const fresh = useQuery(api.products.byIds, hydrated && ids.length ? { ids } : "skip");
  useEffect(() => {
    if (fresh) sync(fresh, idsKey.split(",").filter(Boolean));
  }, [fresh, sync, idsKey]);

  const subtotal = cartSubtotal(items);
  const coupon = useQuery(api.coupons.check, hydrated && couponCode && subtotal > 0 ? { code: couponCode, subtotal } : "skip");
  const discount = coupon && coupon.valid ? coupon.discount : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const freeThreshold = settings.freeDeliveryThreshold ?? 0;
  const deliveryFee = items.length === 0 ? 0 : freeThreshold > 0 && afterDiscount >= freeThreshold ? 0 : settings.deliveryFee;
  const total = Math.round((afterDiscount + deliveryFee) * 100) / 100;
  const belowMin = !!settings.minOrderAmount && subtotal < settings.minOrderAmount;

  return {
    hydrated,
    items,
    couponCode,
    coupon,
    subtotal,
    discount,
    deliveryFee,
    total,
    freeThreshold,
    remainingForFree: freeThreshold > 0 ? Math.max(0, freeThreshold - afterDiscount) : 0,
    belowMin,
    minOrderAmount: settings.minOrderAmount,
    syncing: ids.length > 0 && fresh === undefined,
  };
}
