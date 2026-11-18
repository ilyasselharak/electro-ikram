import { serverNow } from "@/lib/time";
import { getTranslations } from "next-intl/server";
import { PackageSearch } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";
import { ProductGrid } from "../product-grid";
import { FiltersSheet, FiltersSidebar, SortSelect } from "./listing-controls";
import { PaginationLinks } from "./pagination-links";
import type { ListingParams } from "@/lib/listing";

type Listing = NonNullable<FunctionReturnType<typeof api.products.listing>>;

export async function ListingView({
  data,
  params,
  basePath,
  q,
  locale,
  emptyText,
}: {
  data: Listing;
  params: ListingParams;
  basePath: string;
  q?: string;
  locale: string;
  emptyText?: string;
}) {
  const t = await getTranslations({ locale });
  const activeCount =
    params.brands.length + (params.minPrice !== undefined || params.maxPrice !== undefined ? 1 : 0) + (params.inStock ? 1 : 0);
  const filtered = activeCount > 0;
  const now = serverNow();

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <FiltersSidebar params={params} facets={data.facets} basePath={basePath} q={q} />
      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t("common.productCount", { count: data.total })}
            {data.pageCount > 1 && <span> · {t("listing.pageOf", { page: data.page, total: data.pageCount })}</span>}
          </p>
          <div className="flex items-center gap-2">
            <FiltersSheet params={params} facets={data.facets} basePath={basePath} q={q} activeCount={activeCount} />
            <SortSelect params={params} basePath={basePath} q={q} />
          </div>
        </div>
        {data.items.length ? (
          <>
            <ProductGrid products={data.items} now={now} priorityCount={4} className="lg:grid-cols-3 xl:grid-cols-4" />
            <PaginationLinks basePath={basePath} params={params} page={data.page} pageCount={data.pageCount} q={q} />
          </>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed py-20 text-center">
            <PackageSearch className="size-12 text-muted-foreground/50" />
            <p className="mt-4 max-w-sm text-muted-foreground">
              {filtered ? t("listing.noResults") : emptyText ?? t("listing.noProducts")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
