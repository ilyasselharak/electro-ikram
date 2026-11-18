import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, permanentRedirect } from "@/i18n/navigation";
import { getCategoryBySlug, getListing } from "@/lib/convex-server";
import { buildMetadata, getBaseUrl } from "@/lib/seo";
import { isFiltered, parseListingParams, toSearchString } from "@/lib/listing";
import { Breadcrumbs, type Crumb } from "@/components/store/breadcrumbs";
import { ListingView } from "@/components/store/listing/listing-view";
import { loc } from "@/lib/format";
import type { AppLocale } from "@/lib/site";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: AppLocale; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const res = await getCategoryBySlug({ slug });
  if (!res || res.kind !== "category") return {};
  const c = res.category;
  const lp = parseListingParams(await searchParams);
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = loc(c, "name", locale);
  const seoTitle = loc(c.seo, "title", locale);
  const description = loc(c.seo, "description", locale) || loc(c, "description", locale) || undefined;
  const pageSuffix = lp.page > 1 ? ` — ${t("page", { page: lp.page })}` : "";
  const base = await getBaseUrl();
  return buildMetadata({
    locale,
    path: `/category/${c.slug}`,
    title: `${seoTitle || name}${pageSuffix}`,
    description,
    keywords: c.seo?.keywords,
    canonical: c.seo?.canonicalUrl || (lp.page > 1 ? `${base}/${locale}/category/${c.slug}${toSearchString({ page: lp.page })}` : undefined),
    image: c.seo?.ogImage ?? c.banner ?? c.image,
    ogTitle: c.seo?.ogTitle,
    ogDescription: c.seo?.ogDescription,
    noindex: c.seo?.noindex || isFiltered(lp),
    nofollow: c.seo?.nofollow,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const res = await getCategoryBySlug({ slug });
  if (!res) notFound();
  if (res.kind === "redirect") permanentRedirect({ href: `/category/${res.slug}`, locale });
  if (res.kind !== "category") notFound();
  const c = res.category;
  const lp = parseListingParams(await searchParams);
  const [data, t, base] = await Promise.all([
    getListing({
      categorySlug: c.slug,
      sort: lp.sort,
      page: lp.page,
      brands: lp.brands,
      minPrice: lp.minPrice,
      maxPrice: lp.maxPrice,
      inStock: lp.inStock || undefined,
    }),
    getTranslations({ locale }),
    getBaseUrl(),
  ]);
  if (!data) notFound();
  const name = loc(c, "name", locale);
  const description = loc(c, "description", locale);
  const crumbs: Crumb[] = [
    ...(c.parent ? [{ name: loc(c.parent, "name", locale), href: `/category/${c.parent.slug}` }] : []),
    { name, href: `/category/${c.slug}` },
  ];

  return (
    <div className="container-page py-6 sm:py-8">
      <Breadcrumbs items={crumbs} locale={locale} base={base} homeLabel={t("common.home")} />
      {c.banner ? (
        <div className="relative mt-5 overflow-hidden rounded-2xl bg-navy sm:rounded-3xl">
          <div className="relative aspect-[16/7] sm:aspect-[16/5]">
            <Image src={c.banner.url} alt={c.banner.alt || name} fill priority sizes="(min-width:1280px) 1216px, 100vw" className="object-cover" />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-navy/80 via-navy/20 to-transparent p-6 sm:p-10">
              <div className="max-w-2xl text-white">
                <h1 className="text-2xl font-extrabold sm:text-4xl">{name}</h1>
                {description && <p className="mt-2 line-clamp-2 text-sm text-white/85 sm:text-base">{description}</p>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-secondary/70 px-6 py-8 sm:px-10">
          <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">{name}</h1>
          {description && <p className="mt-2 max-w-3xl text-muted-foreground">{description}</p>}
        </div>
      )}
      {c.children.length > 0 && (
        <div className="mt-6">
          <h2 className="sr-only">{t("listing.subcategories")}</h2>
          <ul className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
            {c.children.map((s) => (
              <li key={s._id} className="shrink-0">
                <Link href={`/category/${s.slug}`} className="inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium hover:border-primary hover:text-primary">
                  {loc(s, "name", locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-8">
        <ListingView data={data} params={lp} basePath={`/category/${c.slug}`} locale={locale} />
      </div>
    </div>
  );
}
