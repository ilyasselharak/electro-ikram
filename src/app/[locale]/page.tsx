import { serverNow } from "@/lib/time";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getHomepage, getSettings } from "@/lib/convex-server";
import { buildMetadata, getBaseUrl, localBusinessJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { HomeSection } from "@/components/store/home/sections";
import { JsonLd } from "@/components/shared/json-ld";
import type { AppLocale } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({ locale, path: "" });
}

export default async function HomePage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [sections, settings, base] = await Promise.all([getHomepage({}), getSettings({}), getBaseUrl()]);
  const now = serverNow();
  const business = localBusinessJsonLd(base, locale, settings);

  return (
    <div className="space-y-14 pb-4 sm:space-y-20">
      {sections.map((s) => (
        <HomeSection key={s._id} section={s} locale={locale} now={now} />
      ))}
      <JsonLd
        data={[
          organizationJsonLd(base, settings),
          websiteJsonLd(base, locale, settings.storeName),
          ...(business ? [business] : []),
        ]}
      />
    </div>
  );
}
