"use client";

import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { History, Loader2, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { api } from "@convex/_generated/api";
import { Link, useRouter } from "@/i18n/navigation";
import { useDebounced } from "@/hooks/use-debounced";
import { useBrowsing } from "@/stores/browsing";
import { useHydrated } from "@/hooks/use-hydrated";
import { ProductImage } from "./product-image";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SearchBox({ className, autoFocus, onNavigate }: { className?: string; autoFocus?: boolean; onNavigate?: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(q.trim(), 220);
  const hydrated = useHydrated();
  const history = useBrowsing((s) => s.searchHistory);
  const addSearch = useBrowsing((s) => s.addSearch);
  const clearSearches = useBrowsing((s) => s.clearSearches);
  const results = useQuery(api.products.suggest, debounced.length >= 2 ? { q: debounced } : "skip");
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (term: string) => {
    const value = term.trim();
    if (!value) return;
    addSearch(value);
    setOpen(false);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(value)}`);
  };
  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  const loading = debounced.length >= 2 && results === undefined;
  const showHistory = hydrated && q.trim().length < 2 && history.length > 0;
  const hasResults = results && (results.products.length || results.categories.length || results.brands.length);

  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder={t("header.searchPlaceholder")}
          aria-label={t("search.title")}
          role="combobox"
          aria-controls={listId}
          aria-expanded={open}
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-input bg-secondary/60 ps-10 pe-24 text-[15px] outline-none transition placeholder:text-muted-foreground/80 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute end-[4.6rem] top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={t("common.close")}
          >
            <X className="size-4" />
          </button>
        )}
        <button
          type="submit"
          className="absolute end-1.5 top-1/2 h-8 -translate-y-1/2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : t("search.title")}
        </button>
      </form>

      {open && (showHistory || debounced.length >= 2) && (
        <div
          id={listId}
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-xl shadow-navy/10"
        >
          {showHistory && (
            <div className="p-1">
              <div className="mb-1 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{t("search.recent")}</span>
                <button type="button" onClick={clearSearches} className="normal-case hover:text-primary">
                  {t("search.clearHistory")}
                </button>
              </div>
              {history.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => go(h)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-sm hover:bg-accent"
                >
                  <History className="size-4 text-muted-foreground" />
                  {h}
                </button>
              ))}
            </div>
          )}
          {debounced.length >= 2 && results && !hasResults && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("search.noSuggestions")}</p>
          )}
          {results && results.categories.length + results.brands.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2">
              {results.categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  onClick={close}
                  className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:bg-primary hover:text-primary-foreground"
                >
                  {locale === "ar" ? c.nameAr : c.nameFr}
                </Link>
              ))}
              {results.brands.map((b) => (
                <Link
                  key={b.slug}
                  href={`/brand/${b.slug}`}
                  onClick={close}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary"
                >
                  {b.name}
                </Link>
              ))}
            </div>
          )}
          {results?.products.map((p) => (
            <Link
              key={p._id}
              href={`/product/${p.slug}`}
              onClick={() => {
                addSearch(q);
                close();
              }}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent"
            >
              <ProductImage image={p.image} alt="" sizes="48px" className="size-12 shrink-0 rounded-lg border" imgClassName="p-1" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{locale === "ar" ? p.nameAr : p.nameFr}</p>
                <p className="text-xs text-muted-foreground">
                  {p.brand?.name ? `${p.brand.name} · ` : ""}
                  {p.sku}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(p.price, locale)}</span>
            </Link>
          ))}
          {results && results.products.length > 0 && (
            <button
              type="button"
              onClick={() => go(q)}
              className="mt-1 w-full rounded-lg bg-secondary py-2.5 text-sm font-semibold text-primary hover:bg-accent"
            >
              {t("search.seeAll")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
