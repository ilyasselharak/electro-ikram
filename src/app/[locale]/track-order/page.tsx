import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { TrackOrderForm } from "@/components/store/track-order-form";
import type { AppLocale } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return buildMetadata({ locale, path: "/track-order", title: t("meta.track"), description: t("track.subtitle") });
}

export default async function Page({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "track" });
  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <TrackOrderForm />
    </div>
  );
}
