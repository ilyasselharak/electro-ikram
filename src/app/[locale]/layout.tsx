import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { DM_Sans, IBM_Plex_Sans_Arabic, Inter, Manrope, Poppins } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getCategories, getSettings } from "@/lib/convex-server";
import { buildMetadata } from "@/lib/seo";
import { buildTree } from "@/lib/categories";
import { cldUrl } from "@/lib/cloudinary";
import { PublicConvexProvider } from "@/providers/convex-provider";
import { StoreSettingsProvider } from "@/providers/store-settings";
import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { WhatsappFab } from "@/components/store/whatsapp-fab";
import { AccountGuard } from "@/components/store/account/account-guard";
import { DEFAULT_THEME, themeCss } from "@convex/lib/theme";
import type { AppLocale } from "@/lib/site";
import "../globals.css";

// Latin fonts the admin can pick in Apparence; only the chosen one is downloaded by browsers.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-poppins", display: "swap", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap", preload: false });
const fontVars = [manrope, inter, poppins, dmSans].map((f) => f.variable).join(" ");
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const settings = await getSettings({});
  const base = await buildMetadata({ locale: locale as AppLocale, path: "" });
  const siteTitle = (locale === "ar" ? settings.seo.siteTitleAr : settings.seo.siteTitleFr) || settings.storeName;
  const favicon = settings.favicon ? cldUrl(settings.favicon, { width: 64, height: 64, crop: "fill", format: "auto" }) : undefined;
  return {
    ...base,
    title: { default: siteTitle, template: `%s | ${settings.storeName}` },
    applicationName: settings.storeName,
    icons: favicon ? { icon: favicon, apple: cldUrl(settings.favicon, { width: 180, height: 180, crop: "fill" }) } : undefined,
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [settings, categories, t] = await Promise.all([
    getSettings({}),
    getCategories({}),
    getTranslations({ locale, namespace: "contact" }),
  ]);
  const tree = buildTree(categories);
  const theme = settings.theme ?? DEFAULT_THEME;

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fontVars} ${arabic.variable}`}
      data-card={theme.cardStyle}
      data-header={theme.headerStyle}
      suppressHydrationWarning
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
      </head>
      <body className="flex min-h-dvh flex-col bg-white text-foreground antialiased">
        <NextIntlClientProvider>
          <PublicConvexProvider>
            <StoreSettingsProvider value={settings}>
              <DirectionProvider dir={dir}>
                <a
                  href="#main"
                  className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
                >
                  Skip to content
                </a>
                <Header settings={settings} tree={tree} />
                <main id="main" className="flex-1">
                  {children}
                </main>
                <Footer settings={settings} tree={tree} />
                <WhatsappFab
                  number={settings.whatsapp}
                  message={locale === "ar" ? "مرحباً إلكترو إكرام" : "Bonjour Electro-Ikram"}
                  label={t("writeWhatsapp")}
                />
                <AccountGuard />
                <Toaster position={dir === "rtl" ? "top-left" : "top-right"} richColors closeButton dir={dir} />
              </DirectionProvider>
            </StoreSettingsProvider>
          </PublicConvexProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
