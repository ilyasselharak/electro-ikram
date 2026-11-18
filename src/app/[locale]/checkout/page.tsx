import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { CheckoutForm } from "@/components/store/cart/checkout-form";
import type { AppLocale } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildMetadata({ locale, path: "/checkout", title: t("checkout"), noindex: true });
}

export default async function Page({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="mb-8 text-2xl font-extrabold text-navy sm:text-3xl">{t("checkout")}</h1>
      <CheckoutForm />
    </div>
  );
}
