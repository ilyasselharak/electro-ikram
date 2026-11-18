import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heart, Package, MapPin } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { AuthForm } from "@/components/store/account/auth-form";
import type { AppLocale } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildMetadata({ locale, path: "/account/login", title: t("login"), noindex: true });
}

export default async function LoginPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const perks = [
    { icon: Package, text: t("account.tabs.orders") },
    { icon: Heart, text: t("wishlist.title") },
    { icon: MapPin, text: t("account.tabs.addresses") },
  ];
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border bg-white lg:grid-cols-[1fr_1.1fr]">
        <div className="relative hidden flex-col justify-between bg-navy p-10 text-white lg:flex">
          <div className="pointer-events-none absolute -end-24 -top-24 size-72 rounded-full bg-primary/40 blur-3xl" />
          <div className="relative">
            <h1 className="text-3xl font-extrabold leading-tight">{t("account.title")}</h1>
            <p className="mt-3 max-w-xs text-white/75">{t("auth.subtitle")}</p>
          </div>
          <ul className="relative space-y-3">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-medium">
                <span className="grid size-9 place-items-center rounded-xl bg-white/10">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-6 sm:p-10">
          <h1 className="mb-6 text-2xl font-extrabold text-navy lg:hidden">{t("account.title")}</h1>
          <Suspense>
            <AuthForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
