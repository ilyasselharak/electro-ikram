import "server-only";
import type { Metadata } from "next";
import { getSettings } from "./convex-server";
import { ogImageUrl, cldUrl, type ImageAsset } from "./cloudinary";
import { SITE_URL, SITE_NAME, type AppLocale } from "./site";
import { formatPrice } from "./format";

export async function getBaseUrl() {
  const settings = await getSettings({});
  return (settings.seo.canonicalBase || SITE_URL).replace(/\/$/, "");
}

type PageMetaInput = {
  locale: AppLocale;
  /** Path without locale prefix, e.g. "/product/frigo" ("" for home). */
  path: string;
  title?: string;
  description?: string;
  image?: ImageAsset | null;
  keywords?: string[];
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  noindex?: boolean;
  nofollow?: boolean;
  type?: "website" | "article";
  /** Use the title as-is (skip the "| Electro-Ikram" template). */
  absoluteTitle?: boolean;
};

/** Localised metadata with canonical, hreflang alternates, Open Graph and Twitter cards. */
export async function buildMetadata(input: PageMetaInput): Promise<Metadata> {
  const settings = await getSettings({});
  const base = (settings.seo.canonicalBase || SITE_URL).replace(/\/$/, "");
  const seo = settings.seo;
  const isAr = input.locale === "ar";
  const siteTitle = (isAr ? seo.siteTitleAr : seo.siteTitleFr) || SITE_NAME;
  const description =
    input.description || (isAr ? seo.siteDescriptionAr : seo.siteDescriptionFr) || undefined;
  const url = `${base}/${input.locale}${input.path}`;
  const canonical = input.canonical || url;
  const image = ogImageUrl(input.image) ?? ogImageUrl(seo.ogImage ?? null);
  const index = seo.robotsIndex && !input.noindex;
  const follow = seo.robotsFollow && !input.nofollow;
  const title = input.title
    ? input.absoluteTitle
      ? { absolute: input.title }
      : input.title
    : { absolute: siteTitle };
  const keywords = [...(input.keywords ?? []), ...(input.keywords?.length ? [] : seo.keywords ?? [])];

  return {
    metadataBase: new URL(base),
    title,
    description,
    keywords: keywords.length ? keywords : undefined,
    alternates: {
      canonical,
      languages: {
        fr: `${base}/fr${input.path}`,
        ar: `${base}/ar${input.path}`,
        "x-default": `${base}/fr${input.path}`,
      },
    },
    openGraph: {
      type: input.type ?? "website",
      url,
      siteName: settings.storeName || SITE_NAME,
      title: input.ogTitle || input.title || siteTitle,
      description: input.ogDescription || description,
      locale: isAr ? "ar_MA" : "fr_MA",
      alternateLocale: isAr ? ["fr_MA"] : ["ar_MA"],
      images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: input.ogTitle || input.title || siteTitle,
      description: input.ogDescription || description,
      images: image ? [image] : undefined,
      site: seo.twitterHandle || undefined,
    },
    robots: {
      index,
      follow,
      googleBot: { index, follow, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

/* ------------------------------ Structured data ------------------------------ */

export function breadcrumbJsonLd(base: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${base}${it.path}`,
    })),
  };
}

export function organizationJsonLd(
  base: string,
  settings: Awaited<ReturnType<typeof getSettings>>,
) {
  const sameAs = Object.values(settings.social).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: settings.storeName,
    url: base,
    logo: settings.logo ? cldUrl(settings.logo, { width: 512 }) : undefined,
    email: settings.email || undefined,
    telephone: settings.phone || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

export function websiteJsonLd(base: string, locale: AppLocale, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: `${base}/${locale}`,
    name,
    inLanguage: locale === "ar" ? "ar-MA" : "fr-MA",
    publisher: { "@id": `${base}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/${locale}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function localBusinessJsonLd(
  base: string,
  locale: AppLocale,
  settings: Awaited<ReturnType<typeof getSettings>>,
) {
  const address = locale === "ar" ? settings.addressAr : settings.addressFr;
  if (!address && !settings.phone) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    "@id": `${base}/#store`,
    name: settings.storeName,
    url: base,
    image: settings.logo ? cldUrl(settings.logo, { width: 512 }) : undefined,
    telephone: settings.phone || undefined,
    email: settings.email || undefined,
    priceRange: "$$",
    currenciesAccepted: "MAD",
    paymentAccepted: "Cash",
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: address,
          addressLocality: settings.city || undefined,
          addressCountry: "MA",
        }
      : undefined,
  };
}

type ProductForLd = {
  slug: string;
  nameFr: string;
  nameAr: string;
  sku: string;
  barcode?: string;
  price: number;
  stock: number;
  images: ImageAsset[];
  descriptionFr: string;
  descriptionAr: string;
  shortDescriptionFr?: string;
  shortDescriptionAr?: string;
  brandDetail: { name: string } | null;
  category: { nameFr: string; nameAr: string } | null;
  warrantyFr?: string;
};

/** Product JSON-LD with an accurate Offer (price in MAD, live availability). No ratings. */
export function productJsonLd(base: string, locale: AppLocale, p: ProductForLd, deliveryFee: number) {
  const isAr = locale === "ar";
  const description = (isAr ? p.shortDescriptionAr || p.descriptionAr : p.shortDescriptionFr || p.descriptionFr) || undefined;
  const priceValidUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: isAr ? p.nameAr : p.nameFr,
    sku: p.sku,
    gtin13: p.barcode && /^\d{13}$/.test(p.barcode) ? p.barcode : undefined,
    mpn: p.sku,
    description: description?.slice(0, 5000),
    image: p.images.map((img) => cldUrl(img, { width: 1200 })).filter(Boolean),
    brand: p.brandDetail ? { "@type": "Brand", name: p.brandDetail.name } : undefined,
    category: p.category ? (isAr ? p.category.nameAr : p.category.nameFr) : undefined,
    offers: {
      "@type": "Offer",
      url: `${base}/${locale}/product/${p.slug}`,
      priceCurrency: "MAD",
      price: p.price.toFixed(2),
      priceValidUntil,
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${base}/#organization` },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: deliveryFee.toFixed(2), currency: "MAD" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "MA" },
      },
    },
  };
}

export function priceText(price: number, locale: AppLocale) {
  return formatPrice(price, locale);
}
