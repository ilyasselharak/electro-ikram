import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toSearchString, type ListingParams } from "@/lib/listing";
import { cn } from "@/lib/utils";

function pages(current: number, total: number) {
  const set = new Set([1, total, current, current - 1, current + 1]);
  const list = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  list.forEach((p, i) => {
    if (i > 0 && p - list[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

/** Crawlable pagination (plain links with ?page=N). */
export function PaginationLinks({ basePath, params, page, pageCount, q }: { basePath: string; params: ListingParams; page: number; pageCount: number; q?: string }) {
  const t = useTranslations("common");
  if (pageCount <= 1) return null;
  const href = (p: number) => `${basePath}${toSearchString({ ...params, q, page: p })}`;
  const btn = "grid h-10 min-w-10 place-items-center rounded-lg border px-3 text-sm font-medium transition";
  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(btn, "hover:border-primary hover:text-primary")} rel="prev" aria-label={t("previous")}>
          <ChevronLeft className="rtl-flip size-4" />
        </Link>
      ) : (
        <span className={cn(btn, "opacity-40")} aria-hidden>
          <ChevronLeft className="rtl-flip size-4" />
        </span>
      )}
      {pages(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(btn, p === page ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:text-primary")}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={cn(btn, "hover:border-primary hover:text-primary")} rel="next" aria-label={t("next")}>
          <ChevronRight className="rtl-flip size-4" />
        </Link>
      ) : (
        <span className={cn(btn, "opacity-40")} aria-hidden>
          <ChevronRight className="rtl-flip size-4" />
        </span>
      )}
    </nav>
  );
}
