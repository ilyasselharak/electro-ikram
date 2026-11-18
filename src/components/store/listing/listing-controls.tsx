"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { SORTS, toSearchString, type ListingParams, type Sort } from "@/lib/listing";
import { cn } from "@/lib/utils";

type Facets = { brands: { slug: string; name: string; count: number }[]; priceRange: { min: number; max: number } };

const sortKey: Record<Sort, string> = {
  newest: "sortNewest",
  price_asc: "sortPriceAsc",
  price_desc: "sortPriceDesc",
  popular: "sortPopular",
  discount: "sortDiscount",
};

function useNavigate(basePath: string, q?: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const navigate = (p: Partial<ListingParams>) =>
    start(() => router.push(`${basePath}${toSearchString({ ...p, q, page: 1 })}`, { scroll: false }));
  return { navigate, pending };
}

export function SortSelect({ params, basePath, q }: { params: ListingParams; basePath: string; q?: string }) {
  const t = useTranslations("listing");
  const { navigate, pending } = useNavigate(basePath, q);
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted-foreground sm:inline">{t("sort")}</span>
      {pending && <Loader2 className="size-4 animate-spin text-primary" />}
      <select
        value={params.sort ?? (q ? "" : "newest")}
        onChange={(e) => navigate({ ...params, sort: (e.target.value || undefined) as Sort | undefined })}
        className="h-10 rounded-lg border border-input bg-white px-3 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        aria-label={t("sort")}
      >
        {q && <option value="">—</option>}
        {SORTS.map((s) => (
          <option key={s} value={s}>
            {t(sortKey[s])}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterForm({ params, facets, basePath, q, onDone }: { params: ListingParams; facets: Facets; basePath: string; q?: string; onDone?: () => void }) {
  const t = useTranslations("listing");
  const { navigate, pending } = useNavigate(basePath, q);
  const [brands, setBrands] = useState<string[]>(params.brands);
  const [min, setMin] = useState(params.minPrice?.toString() ?? "");
  const [max, setMax] = useState(params.maxPrice?.toString() ?? "");
  const [inStock, setInStock] = useState(params.inStock);

  const apply = () => {
    navigate({
      sort: params.sort,
      brands,
      minPrice: min ? Number(min) : undefined,
      maxPrice: max ? Number(max) : undefined,
      inStock,
    });
    onDone?.();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="space-y-6"
    >
      {facets.brands.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-navy">{t("brands")}</legend>
          <div className="max-h-64 space-y-2.5 overflow-y-auto pe-1">
            {facets.brands.map((b) => (
              <label key={b.slug} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={brands.includes(b.slug)}
                  onCheckedChange={(v) => setBrands((cur) => (v ? [...cur, b.slug] : cur.filter((x) => x !== b.slug)))}
                />
                <span className="flex-1">{b.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{b.count}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-navy">{t("price")}</legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder={`${t("min")} ${facets.priceRange.min || ""}`}
            aria-label={t("min")}
            className="h-10 w-full rounded-lg border border-input px-3 text-sm outline-none focus:border-primary"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder={`${t("max")} ${facets.priceRange.max || ""}`}
            aria-label={t("max")}
            className="h-10 w-full rounded-lg border border-input px-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
        <Checkbox checked={inStock} onCheckedChange={(v) => setInStock(!!v)} />
        {t("inStockOnly")}
      </label>
      <div className="flex gap-2">
        <Button type="submit" className="h-10 flex-1 rounded-lg" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {onDone ? t("showResults") : t("apply")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-lg"
          onClick={() => {
            setBrands([]);
            setMin("");
            setMax("");
            setInStock(false);
            navigate({ sort: params.sort });
            onDone?.();
          }}
        >
          {t("reset")}
        </Button>
      </div>
    </form>
  );
}

export function FiltersSidebar(props: { params: ListingParams; facets: Facets; basePath: string; q?: string }) {
  const t = useTranslations("listing");
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-40 rounded-2xl border border-border/70 p-5">
        <h2 className="mb-5 flex items-center gap-2 font-semibold text-navy">
          <SlidersHorizontal className="size-4" /> {t("filters")}
        </h2>
        <FilterForm {...props} key={JSON.stringify(props.params)} />
      </div>
    </aside>
  );
}

export function FiltersSheet(props: { params: ListingParams; facets: Facets; basePath: string; q?: string; activeCount: number }) {
  const t = useTranslations("listing");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-lg border border-input px-3.5 text-sm font-medium lg:hidden",
            props.activeCount > 0 && "border-primary text-primary",
          )}
        >
          <SlidersHorizontal className="size-4" />
          {t("filters")}
          {props.activeCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">{props.activeCount}</span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl p-5">
        <SheetHeader className="p-0 pb-4">
          <SheetTitle>{t("filters")}</SheetTitle>
        </SheetHeader>
        <FilterForm {...props} onDone={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
