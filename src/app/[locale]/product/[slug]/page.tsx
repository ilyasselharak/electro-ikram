import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Banknote, Headset, ShieldCheck, Truck } from "lucide-react";
import { Link, permanentRedirect } from "@/i18n/navigation";
import { getProductBySlug, getRelated, getSettings } from "@/lib/convex-server";
import { buildMetadata, getBaseUrl, productJsonLd } from "@/lib/seo";
import { formatPrice, loc } from "@/lib/format";
import { Breadcrumbs, type Crumb } from "@/components/store/breadcrumbs";
import { ProductGallery } from "@/components/store/product/gallery";
import { PurchasePanel } from "@/components/store/product/purchase-panel";
import { ViewTracker } from "@/components/store/product/view-tracker";
import { RecentlyViewed } from "@/components/store/product/recently-viewed";
import { ProductReviews } from "@/components/store/product/reviews";
import { WishlistButton } from "@/components/store/account/wishlist-button";
import { Stars } from "@/components/store/stars";
import { Price } from "@/components/store/price";
import { ProductRail } from "@/components/store/product-grid";
import { SectionHeader } from "@/components/store/section-header";
import { JsonLd } from "@/components/shared/json-ld";
import type { AppLocale } from "@/lib/site";

export const revalidate = 60;

export async function generateStaticParams() {
  // Rendered on first request, then statically regenerated (ISR).
  return [];
}

type Props = { params: Promise<{ locale: AppLocale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const res = await getProductBySlug({ slug });
  if (!res || res.kind !== "product") return {};
  const p = res.product;
  const name = loc(p, "name", locale);
  const seo = p.seo;
  const description =
    loc(seo, "description", locale) ||
    loc(p, "shortDescription", locale) ||
    loc(p, "description", locale).slice(0, 160) ||
    undefined;
  return buildMetadata({
    locale,
    path: `/product/${p.slug}`,
    title: loc(seo, "title", locale) || `${name}${p.brand ? ` — ${p.brand.name}` : ""}`,
    description,
    keywords: [seo?.focusKeyword, ...(seo?.keywords ?? [])].filter((k): k is string => !!k),
    canonical: seo?.canonicalUrl,
    image: seo?.ogImage ?? p.images[0],
    ogTitle: seo?.ogTitle,
    ogDescription: seo?.ogDescription,
    noindex: seo?.noindex,
    nofollow: seo?.nofollow,
  });
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const res = await getProductBySlug({ slug });
  if (!res) notFound();
  if (res.kind === "redirect") permanentRedirect({ href: `/product/${res.slug}`, locale });
  if (res.kind !== "product") notFound();
  const p = res.product;
  const [related, settings, t, base] = await Promise.all([
    getRelated({ productId: p._id, limit: 8 }),
    getSettings({}),
    getTranslations({ locale }),
    getBaseUrl(),
  ]);

  const name = loc(p, "name", locale);
  const description = loc(p, "description", locale);
  const short = loc(p, "shortDescription", locale);
  const warranty = loc(p, "warranty", locale);
  const out = p.stock <= 0;
  const crumbs: Crumb[] = [
    ...(p.parentCategory ? [{ name: loc(p.parentCategory, "name", locale), href: `/category/${p.parentCategory.slug}` }] : []),
    ...(p.category ? [{ name: loc(p.category, "name", locale), href: `/category/${p.category.slug}` }] : []),
    { name, href: `/product/${p.slug}` },
  ];
  const delivery = locale === "ar" ? settings.deliveryDelayAr : settings.deliveryDelayFr;

  return (
    <>
      <div className="container-page py-6 sm:py-8">
        <Breadcrumbs items={crumbs} locale={locale} base={base} homeLabel={t("common.home")} />
        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductGallery images={p.images} name={name} discount={p.discount} />

          <div className="flex flex-col gap-5">
            <div>
              {p.brandDetail && (
                <Link href={`/brand/${p.brandDetail.slug}`} className="text-sm font-semibold uppercase tracking-wider text-primary hover:underline">
                  {p.brandDetail.name}
                </Link>
              )}
              <h1 className="mt-1.5 text-2xl font-bold leading-tight text-navy sm:text-3xl">{name}</h1>
              {p.ratingCount > 0 && (
                <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm hover:text-primary">
                  <Stars value={p.ratingAvg} />
                  <span className="font-semibold tabular-nums">{p.ratingAvg.toFixed(1)}</span>
                  <span className="text-muted-foreground">({t("reviews.count", { count: p.ratingCount })})</span>
                </a>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                {t("common.sku")} : <span className="font-medium text-foreground" dir="ltr">{p.sku}</span>
              </p>
            </div>

            <div className="rounded-2xl bg-secondary/60 p-5">
              <Price price={p.price} oldPrice={p.oldPrice} locale={locale} size="lg" />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {p.discount > 0 && p.oldPrice && (
                  <span className="rounded-md bg-sale/10 px-2 py-0.5 font-semibold text-sale">
                    {t("product.save", { amount: formatPrice(p.oldPrice - p.price, locale) })}
                  </span>
                )}
                <span className="text-muted-foreground">{t("product.taxIncluded")}</span>
              </div>
              <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${out ? "text-destructive" : p.lowStock ? "text-warning" : "text-success"}`}>
                <span className={`size-2 rounded-full ${out ? "bg-destructive" : p.lowStock ? "bg-warning" : "bg-success"}`} />
                {out ? t("common.outOfStock") : p.lowStock ? t("common.lowStock", { count: p.stock }) : t("common.inStock")}
              </p>
            </div>

            {short && <p className="leading-relaxed text-foreground/85">{short}</p>}

            <PurchasePanel
              product={{
                _id: p._id,
                slug: p.slug,
                nameFr: p.nameFr,
                nameAr: p.nameAr,
                sku: p.sku,
                price: p.price,
                oldPrice: p.oldPrice,
                image: p.image,
                stock: p.stock,
              }}
            />
            <WishlistButton productId={p._id} withLabel className="w-full" />

            <ul className="grid grid-cols-2 gap-3 text-sm">
              <li className="flex gap-3 rounded-xl border p-3.5">
                <Truck className="size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-navy">{t("product.deliveryTitle")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {settings.freeDeliveryThreshold
                      ? t("product.freeDeliveryFrom", { amount: formatPrice(settings.freeDeliveryThreshold, locale) })
                      : delivery}
                  </p>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl border p-3.5">
                <Banknote className="size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-navy">{t("product.codTitle")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("product.codText")}</p>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl border p-3.5">
                <ShieldCheck className="size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-navy">{t("product.warrantyTitle")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{warranty || t("product.genuineText")}</p>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl border p-3.5">
                <Headset className="size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-navy">{t("product.supportTitle")}</p>
                  <Link href="/contact" className="mt-0.5 block text-xs text-muted-foreground hover:text-primary">
                    {t("product.supportText")}
                  </Link>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <section aria-labelledby="desc" className="rounded-2xl border p-6 sm:p-8">
            <h2 id="desc" className="text-xl font-bold text-navy">{t("product.description")}</h2>
            <div className="mt-4 whitespace-pre-line leading-relaxed text-foreground/85">
              {description || t("product.noDescription")}
            </div>
          </section>
          <div className="space-y-8">
            {p.specs.length > 0 && (
              <section aria-labelledby="specs" className="rounded-2xl border p-6 sm:p-8">
                <h2 id="specs" className="text-xl font-bold text-navy">{t("product.specs")}</h2>
                <dl className="mt-4 divide-y text-sm">
                  {p.specs.map((s, i) => (
                    <div key={i} className="grid grid-cols-2 gap-4 py-2.5">
                      <dt className="text-muted-foreground">{loc(s, "label", locale)}</dt>
                      <dd className="font-medium text-foreground">{loc(s, "value", locale)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            <section aria-labelledby="delivery-info" className="rounded-2xl border p-6 sm:p-8">
              <h2 id="delivery-info" className="text-xl font-bold text-navy">{t("product.deliveryTitle")}</h2>
              <ul className="mt-4 space-y-2 text-sm text-foreground/85">
                {delivery && <li>• {delivery}</li>}
                <li>• {t("product.deliveryFee", { amount: formatPrice(settings.deliveryFee, locale) })}</li>
                {settings.freeDeliveryThreshold ? (
                  <li>• {t("product.freeDeliveryFrom", { amount: formatPrice(settings.freeDeliveryThreshold, locale) })}</li>
                ) : null}
                <li>• {t("product.codText")}</li>
              </ul>
              <h3 className="mt-6 font-semibold text-navy">{t("product.warrantyTitle")}</h3>
              <p className="mt-2 text-sm text-foreground/85">{warranty ? `${t("common.warranty")} : ${warranty}` : t("product.noWarranty")}</p>
            </section>
          </div>
        </div>
      </div>

      <ProductReviews productId={p._id} slug={p.slug} />

      {related.length > 0 && (
        <section className="container-page mt-16">
          <SectionHeader
            title={t("product.related")}
            href={p.category ? `/category/${p.category.slug}` : undefined}
            linkLabel={t("common.viewAll")}
          />
          <ProductRail products={related.slice(0, 4)} />
        </section>
      )}
      <RecentlyViewed excludeId={p._id} />
      <ViewTracker productId={p._id} />
      <JsonLd data={productJsonLd(base, locale, p, settings.deliveryFee)} />
    </>
  );
}
