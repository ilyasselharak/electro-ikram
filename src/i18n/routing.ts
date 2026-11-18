import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "ar"],
  defaultLocale: "fr",
  localePrefix: "always",
  // Remember the visitor's language choice for a year.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
  // hreflang alternates are generated in page metadata instead.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
