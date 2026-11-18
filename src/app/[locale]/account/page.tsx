import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { AccountDashboard } from "@/components/store/account/account-dashboard";
import type { AppLocale } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildMetadata({ locale, path: "/account", title: t("account"), noindex: true });
}

export default async function AccountPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "account" });
  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="mb-6 text-2xl font-extrabold text-navy sm:text-3xl">{t("title")}</h1>
      <Suspense>
        <AccountDashboard />
      </Suspense>
    </div>
  );
}
