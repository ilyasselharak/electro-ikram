import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Manrope, IBM_Plex_Sans_Arabic } from "next/font/google";
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
import type { AppLocale } from "@/lib/site";
import "../globals.css";

const latin = Manrope({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
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

  return (
    <html lang={locale} dir={dir} className={`${latin.variable} ${arabic.variable}`} suppressHydrationWarning>
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
                <Toaster position={dir === "rtl" ? "top-left" : "top-right"} richColors closeButton dir={dir} />
              </DirectionProvider>
            </StoreSettingsProvider>
          </PublicConvexProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
