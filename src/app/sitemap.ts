import type { MetadataRoute } from "next";
import { getSettings, getSitemapEntries } from "@/lib/convex-server";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const STATIC_PATHS = [
  { path: "", priority: 1, freq: "daily" as const },
  { path: "/products", priority: 0.8, freq: "daily" as const },
  { path: "/offers", priority: 0.8, freq: "daily" as const },
  { path: "/brands", priority: 0.5, freq: "weekly" as const },
  { path: "/contact", priority: 0.4, freq: "monthly" as const },
  { path: "/about", priority: 0.3, freq: "yearly" as const },
  { path: "/faq", priority: 0.4, freq: "monthly" as const },
  { path: "/delivery-policy", priority: 0.3, freq: "yearly" as const },
  { path: "/returns-policy", priority: 0.3, freq: "yearly" as const },
  { path: "/privacy-policy", priority: 0.2, freq: "yearly" as const },
  { path: "/terms", priority: 0.2, freq: "yearly" as const },
  { path: "/track-order", priority: 0.3, freq: "yearly" as const },
];

/** Dynamic multilingual sitemap with hreflang alternates for every URL. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, entries] = await Promise.all([getSettings({}), getSitemapEntries({})]);
  const base = (settings.seo.canonicalBase || SITE_URL).replace(/\/$/, "");
  const both = (path: string, extra: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">) =>
    (["fr", "ar"] as const).map((locale) => ({
      url: `${base}/${locale}${path}`,
      alternates: { languages: { fr: `${base}/fr${path}`, ar: `${base}/ar${path}` } },
      ...extra,
    }));

  return [
    ...STATIC_PATHS.flatMap((s) => both(s.path, { changeFrequency: s.freq, priority: s.priority })),
    ...entries.categories.flatMap((c) =>
      both(`/category/${c.slug}`, { lastModified: new Date(c.updatedAt), changeFrequency: "daily", priority: 0.8 }),
    ),
    ...entries.brands.flatMap((b) =>
      both(`/brand/${b.slug}`, { lastModified: new Date(b.updatedAt), changeFrequency: "weekly", priority: 0.5 }),
    ),
    ...entries.products.flatMap((p) =>
      both(`/product/${p.slug}`, {
        lastModified: new Date(p.updatedAt),
        changeFrequency: "weekly",
        priority: 0.7,
        images: p.image ? [p.image] : undefined,
      }),
    ),
  ];
}
