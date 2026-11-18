import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getBrandBySlug, getListing } from "@/lib/convex-server";
import { buildMetadata, getBaseUrl } from "@/lib/seo";
import { isFiltered, parseListingParams } from "@/lib/listing";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
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
  const brand = await getBrandBySlug({ slug });
  if (!brand) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const lp = parseListingParams(await searchParams);
  return buildMetadata({
    locale,
    path: `/brand/${brand.slug}`,
    title: t("brandTitle", { brand: brand.name }),
    description: loc(brand, "description", locale) || t("brandDescription", { brand: brand.name }),
    image: brand.logo,
    noindex: isFiltered(lp) || lp.page > 1,
  });
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const brand = await getBrandBySlug({ slug });
  if (!brand) notFound();
  const lp = parseListingParams(await searchParams);
  const [data, t, base] = await Promise.all([
    getListing({ brandSlug: slug, sort: lp.sort, page: lp.page, brands: [], minPrice: lp.minPrice, maxPrice: lp.maxPrice, inStock: lp.inStock || undefined }),
    getTranslations({ locale }),
    getBaseUrl(),
  ]);
  if (!data) notFound();
  const description = loc(brand, "description", locale);
  return (
    <div className="container-page py-6 sm:py-8">
      <Breadcrumbs items={[{ name: t("common.brands"), href: "/brands" }, { name: brand.name, href: `/brand/${brand.slug}` }]} locale={locale} base={base} homeLabel={t("common.home")} />
      <div className="mt-5 flex items-center gap-5 rounded-2xl bg-secondary/70 px-6 py-8 sm:px-10">
        {brand.logo && (
          <div className="relative hidden h-16 w-32 shrink-0 rounded-xl bg-white sm:block">
            <Image src={brand.logo.url} alt={brand.name} fill sizes="128px" className="object-contain p-2" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">{brand.name}</h1>
          {description && <p className="mt-2 max-w-3xl text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="mt-8">
        <ListingView data={{ ...data, facets: { ...data.facets, brands: [] } }} params={lp} basePath={`/brand/${brand.slug}`} locale={locale} />
      </div>
    </div>
  );
}
