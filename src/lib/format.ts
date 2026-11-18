import type { AppLocale } from "./site";

export function formatPrice(amount: number, locale: AppLocale | string = "fr") {
  const n = new Intl.NumberFormat(locale === "ar" ? "ar-MA" : "fr-MA", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    numberingSystem: "latn",
  }).format(amount);
  return locale === "ar" ? `${n} درهم` : `${n} DH`;
}

export function formatDate(ts: number, locale: AppLocale | string = "fr", withTime = false) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    numberingSystem: "latn",
    timeZone: "Africa/Casablanca",
  }).format(new Date(ts));
}

/** Picks the localized variant of a bilingual field, falling back to French. */
export function loc<T extends Record<string, unknown>>(obj: T | null | undefined, field: string, locale: string) {
  if (!obj) return "";
  const suffix = locale === "ar" ? "Ar" : "Fr";
  const value = obj[`${field}${suffix}`] ?? obj[`${field}Fr`];
  return typeof value === "string" ? value : "";
}

export function whatsappLink(number: string | undefined, text: string) {
  if (!number) return null;
  let n = number.replace(/[^\d+]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  else if (n.startsWith("00")) n = n.slice(2);
  else if (n.startsWith("0")) n = `212${n.slice(1)}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
