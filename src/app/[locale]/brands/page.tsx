import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getBrands } from "@/lib/convex-server";
import { buildMetadata, getBaseUrl } from "@/lib/seo";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import type { AppLocale } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildMetadata({ locale, path: "/brands", title: t("brands") });
}

export default async function BrandsPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [brands, t, base] = await Promise.all([getBrands({}), getTranslations({ locale }), getBaseUrl()]);
  return (
    <div className="container-page py-6 sm:py-8">
      <Breadcrumbs items={[{ name: t("common.brands"), href: "/brands" }]} locale={locale} base={base} homeLabel={t("common.home")} />
      <h1 className="mt-5 text-2xl font-extrabold text-navy sm:text-3xl">{t("meta.brands")}</h1>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {brands.map((b) => (
          <li key={b._id}>
            <Link href={`/brand/${b.slug}`} className="group grid h-28 place-items-center rounded-2xl border border-border/70 px-4 transition hover:border-primary/30 hover:shadow-md">
              {b.logo ? (
                <span className="relative block h-12 w-full">
                  <Image src={b.logo.url} alt={b.name} fill sizes="200px" className="object-contain" />
                </span>
              ) : (
                <span className="text-lg font-extrabold text-navy/80 group-hover:text-primary">{b.name}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
