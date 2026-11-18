import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/lib/convex-server";
import { buildMetadata, getBaseUrl, localBusinessJsonLd } from "@/lib/seo";
import { whatsappLink } from "@/lib/format";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ContactForm } from "@/components/store/contact-form";
import { WhatsappIcon } from "@/components/store/whatsapp-fab";
import { JsonLd } from "@/components/shared/json-ld";
import type { AppLocale } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return buildMetadata({ locale, path: "/contact", title: t("title"), description: t("subtitle") });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [settings, t, base] = await Promise.all([getSettings({}), getTranslations({ locale }), getBaseUrl()]);
  const address = locale === "ar" ? settings.addressAr : settings.addressFr;
  const hours = locale === "ar" ? settings.businessHoursAr : settings.businessHoursFr;
  const wa = whatsappLink(settings.whatsapp, locale === "ar" ? "مرحباً إلكترو إكرام" : "Bonjour Electro-Ikram");
  const business = localBusinessJsonLd(base, locale, settings);

  return (
    <div className="container-page py-6 sm:py-8">
      <Breadcrumbs items={[{ name: t("contact.title"), href: "/contact" }]} locale={locale} base={base} homeLabel={t("common.home")} />
      <div className="mt-6 max-w-2xl">
        <h1 className="text-3xl font-extrabold text-navy sm:text-4xl">{t("contact.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("contact.subtitle")}</p>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ContactForm />
        <aside className="space-y-4">
          <div className="rounded-2xl bg-navy p-6 text-white">
            <h2 className="text-lg font-bold">{t("contact.info")}</h2>
            <ul className="mt-5 space-y-4 text-sm">
              {settings.phone && (
                <li className="flex gap-3">
                  <Phone className="size-5 shrink-0 text-sidebar-primary" />
                  <a href={`tel:${settings.phone.replace(/\s/g, "")}`} dir="ltr" className="hover:underline">{settings.phone}</a>
                </li>
              )}
              {settings.email && (
                <li className="flex gap-3">
                  <Mail className="size-5 shrink-0 text-sidebar-primary" />
                  <a href={`mailto:${settings.email}`} className="break-all hover:underline">{settings.email}</a>
                </li>
              )}
              {address && (
                <li className="flex gap-3">
                  <MapPin className="size-5 shrink-0 text-sidebar-primary" />
                  <span>{address}</span>
                </li>
              )}
              {hours && (
                <li className="flex gap-3">
                  <Clock className="size-5 shrink-0 text-sidebar-primary" />
                  <span>{hours}</span>
                </li>
              )}
            </ul>
          </div>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-semibold text-white hover:bg-[#1fb857]">
              <WhatsappIcon className="size-5" /> {t("contact.writeWhatsapp")}
            </a>
          )}
        </aside>
      </div>
      {business && <JsonLd data={business} />}
    </div>
  );
}
