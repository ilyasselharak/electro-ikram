import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/convex-server";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings({});
  const base = (settings.seo.canonicalBase || SITE_URL).replace(/\/$/, "");
  const disallow = ["/admin", "/api/", "/fr/cart", "/ar/cart", "/fr/checkout", "/ar/checkout", "/fr/order-confirmation", "/ar/order-confirmation", "/fr/search", "/ar/search"];
  return {
    rules: settings.seo.robotsIndex
      ? [{ userAgent: "*", allow: "/", disallow }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
