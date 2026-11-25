// Used for canonicals, hreflang, sitemap and robots. A deployed build must never
// announce localhost, even when NEXT_PUBLIC_SITE_URL is missing or left at its example value.
const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
const isLocal = !configured || /^https?:\/\/(localhost|127\.0\.0\.1)/.test(configured);
export const SITE_URL = process.env.NODE_ENV === "production" && isLocal ? "https://www.electro-ikram.ma" : configured || "http://localhost:3000";
export const SITE_NAME = "Electro-Ikram";
export const LOCALES = ["fr", "ar"] as const;
export type AppLocale = (typeof LOCALES)[number];

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
