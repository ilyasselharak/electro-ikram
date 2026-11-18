"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@convex/_generated/api";
import { useBrowsing } from "@/stores/browsing";
import { useHydrated } from "@/hooks/use-hydrated";
import { ProductCard } from "../product-card";
import { SectionHeader } from "../section-header";

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const t = useTranslations("product");
  const hydrated = useHydrated();
  const ids = useBrowsing((s) => s.recentlyViewed).filter((id) => id !== excludeId).slice(0, 8);
  const products = useQuery(api.products.byIds, hydrated && ids.length ? { ids } : "skip");
  if (!products?.length) return null;
  const ordered = ids.map((id) => products.find((p) => p._id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  return (
    <section className="container-page mt-16">
      <SectionHeader title={t("recentlyViewed")} />
      <ul className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:px-0 lg:grid-cols-4">
        {ordered.slice(0, 4).map((p) => (
          <li key={p._id} className="w-[46%] shrink-0 snap-start sm:w-auto">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
