import { useLocale, useTranslations } from "next-intl";
import { Banknote, Mail, MapPin, Phone, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PublicSettings } from "@/providers/store-settings";
import type { CategoryNode } from "@/lib/categories";
import { Logo } from "./logo";
import { SocialIcons } from "./social-icons";

export function Footer({ settings, tree }: { settings: PublicSettings; tree: CategoryNode[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const year = new Date().getFullYear();
  const address = locale === "ar" ? settings.addressAr : settings.addressFr;

  return (
    <footer className="mt-20 bg-navy text-white/80">
      <div className="border-b border-white/10">
        <div className="container-page grid gap-4 py-6 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <Truck className="size-6 text-sidebar-primary" />
            <span className="text-sm font-medium text-white">
              {locale === "ar" ? settings.deliveryDelayAr : settings.deliveryDelayFr}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Banknote className="size-6 text-sidebar-primary" />
            <span className="text-sm font-medium text-white">{t("footer.cod")}</span>
          </div>
        </div>
      </div>
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="space-y-4">
          <Logo logo={null} inverted />
          <p className="max-w-sm text-sm leading-relaxed text-white/65">{t("footer.about")}</p>
          <SocialIcons social={settings.social} />
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">{t("footer.shop")}</h2>
          <ul className="space-y-2.5 text-sm">
            {tree.slice(0, 6).map((c) => (
              <li key={c._id}>
                <Link href={`/category/${c.slug}`} className="hover:text-white">
                  {locale === "ar" ? c.nameAr : c.nameFr}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/offers" className="hover:text-white">
                {t("header.offers")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">{t("footer.help")}</h2>
          <ul className="space-y-2.5 text-sm">
            {(
              [
                ["/track-order", "track"],
                ["/faq", "faq"],
                ["/delivery-policy", "delivery"],
                ["/returns-policy", "returns"],
                ["/about", "about"],
                ["/contact", "contact"],
                ["/privacy-policy", "privacy"],
                ["/terms", "terms"],
              ] as const
            ).map(([href, key]) => (
              <li key={href}>
                <Link href={href} className="hover:text-white">
                  {t(`pages.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">{t("footer.contact")}</h2>
          <ul className="space-y-3 text-sm">
            {settings.phone && (
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0" />
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} dir="ltr" className="hover:text-white">
                  {settings.phone}
                </a>
              </li>
            )}
            {settings.email && (
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0" />
                <a href={`mailto:${settings.email}`} className="break-all hover:text-white">
                  {settings.email}
                </a>
              </li>
            )}
            {address && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span>{address}</span>
              </li>
            )}
            <li className="text-white/60">{locale === "ar" ? settings.businessHoursAr : settings.businessHoursFr}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/55 sm:flex-row">
          <p>
            © {year} {settings.storeName}. {t("footer.rights")}
          </p>
          <p>{t("footer.delivery")}</p>
        </div>
      </div>
    </footer>
  );
}
