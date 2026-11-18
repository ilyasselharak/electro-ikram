import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { OrderConfirmation } from "@/components/store/order-confirmation";
import type { AppLocale } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale,
    path: "/order-confirmation",
    title: locale === "ar" ? "تأكيد الطلب" : "Confirmation de commande",
    noindex: true,
    nofollow: true,
  });
}

export default async function Page({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="container-page py-8 sm:py-12">
      <OrderConfirmation />
    </div>
  );
}
