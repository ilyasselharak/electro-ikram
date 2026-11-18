"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useBrowsing } from "@/stores/browsing";

/** Records a product view (analytics) and remembers it for "recently viewed". */
export function ViewTracker({ productId }: { productId: string }) {
  const record = useMutation(api.products.recordView);
  const addViewed = useBrowsing((s) => s.addViewed);
  useEffect(() => {
    addViewed(productId);
    const key = `viewed:${productId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    record({ productId: productId as Id<"products"> }).catch(() => {});
  }, [productId, record, addViewed]);
  return null;
}
