import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchX, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCategories, getListing } from "@/lib/convex-server";
import { buildMetadata } from "@/lib/seo";
import { parseListingParams } from "@/lib/listing";
import { ListingView } from "@/components/store/listing/listing-view";
import { SearchBox } from "@/components/store/search-box";
import { RecordSearch } from "@/components/store/record-search";
import type { AppLocale } from "@/lib/site";

type Props = {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const getQ = (sp: Record<string, string | string[] | undefined>) => {
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return (q ?? "").trim().slice(0, 100);
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const q = getQ(await searchParams);
  const t = await getTranslations({ locale, namespace: "meta" });
  // Internal search result pages should not be indexed.
  return buildMetadata({ locale, path: "/search", title: q ? t("searchTitle", { q }) : t("searchTitleEmpty"), noindex: true });
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q = getQ(sp);
  const lp = parseListingParams(sp);
  const t = await getTranslations({ locale });

  if (!q) {
    const categories = (await getCategories({})).filter((c) => !c.parentId).slice(0, 10);
    return (
      <div className="container-page py-10">
        <div className="mx-auto max-w-2xl text-center">
          <Search className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-2xl font-bold text-navy">{t("search.startTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("search.startText")}</p>
          <SearchBox className="mt-6" />
          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("search.popular")}</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <Link key={c._id} href={`/category/${c.slug}`} className="rounded-full border px-4 py-2 text-sm hover:border-primary hover:text-primary">
                {locale === "ar" ? c.nameAr : c.nameFr}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const data = await getListing({ q, sort: lp.sort, page: lp.page, brands: lp.brands, minPrice: lp.minPrice, maxPrice: lp.maxPrice, inStock: lp.inStock || undefined });
  return (
    <div className="container-page py-6 sm:py-8">
      <RecordSearch q={q} />
      <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">{t("search.resultsFor", { q })}</h1>
      <div className="mt-8">
        {data && data.total === 0 && lp.brands.length === 0 && !lp.inStock && lp.minPrice === undefined && lp.maxPrice === undefined ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-20 text-center">
            <SearchX className="size-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-semibold">{t("search.emptyTitle")}</h2>
            <p className="mt-2 max-w-md text-muted-foreground">{t("search.emptyText", { q })}</p>
            <SearchBox className="mt-6 max-w-lg" />
          </div>
        ) : (
          data && <ListingView data={data} params={lp} basePath="/search" q={q} locale={locale} />
        )}
      </div>
    </div>
  );
}
