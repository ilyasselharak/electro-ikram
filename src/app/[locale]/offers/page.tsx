import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getListing } from "@/lib/convex-server";
import { buildMetadata, getBaseUrl } from "@/lib/seo";
import { isFiltered, parseListingParams } from "@/lib/listing";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ListingView } from "@/components/store/listing/listing-view";
import type { AppLocale } from "@/lib/site";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const lp = parseListingParams(await searchParams);
  return buildMetadata({ locale, path: "/offers", title: t("offers"), description: t("offersDescription"), noindex: isFiltered(lp) || lp.page > 1 });
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lp = parseListingParams(await searchParams);
  const [data, t, base] = await Promise.all([
    getListing({ onSale: true, sort: lp.sort, page: lp.page, brands: lp.brands, minPrice: lp.minPrice, maxPrice: lp.maxPrice, inStock: lp.inStock || undefined }),
    getTranslations({ locale }),
    getBaseUrl(),
  ]);
  return (
    <div className="container-page py-6 sm:py-8">
      <Breadcrumbs items={[{ name: t("header.offers"), href: "/offers" }]} locale={locale} base={base} homeLabel={t("common.home")} />
      <h1 className="mt-5 text-2xl font-extrabold text-navy sm:text-3xl">{t("meta.offers")}</h1>
      <div className="mt-8">{data && <ListingView data={data} params={lp} basePath="/offers" locale={locale} />}</div>
    </div>
  );
}
