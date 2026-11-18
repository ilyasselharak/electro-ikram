import { ChevronRight, Home } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/shared/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo";

export type Crumb = { name: string; href?: string };

/** Visible breadcrumb navigation plus BreadcrumbList structured data. */
export function Breadcrumbs({ items, locale, base, homeLabel }: { items: Crumb[]; locale: string; base: string; homeLabel: string }) {
  const all: Crumb[] = [{ name: homeLabel, href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          {all.map((c, i) => {
            const last = i === all.length - 1;
            return (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="rtl-flip size-3.5 opacity-60" aria-hidden />}
                {c.href && !last ? (
                  <Link href={c.href} className="flex items-center gap-1 hover:text-primary">
                    {i === 0 && <Home className="size-3.5" aria-hidden />}
                    {c.name}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined} className={last ? "line-clamp-1 font-medium text-foreground" : ""}>
                    {c.name}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={breadcrumbJsonLd(
          base,
          all.map((c) => ({ name: c.name, path: `/${locale}${c.href === "/" ? "" : c.href ?? ""}` })),
        )}
      />
    </>
  );
}
