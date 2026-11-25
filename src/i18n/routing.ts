import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "ar"],
  defaultLocale: "ar",
  localePrefix: "always",
  // URLs without a language always go to Arabic, whatever the browser language
  // or the last language used. The language then comes from the URL only.
  localeDetection: false,
  localeCookie: false,
  // hreflang alternates are generated in page metadata instead.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
