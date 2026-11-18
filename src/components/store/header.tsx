import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, LayoutGrid, Package, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CategoryNode } from "@/lib/categories";
import type { PublicSettings } from "@/providers/store-settings";
import { DynamicIcon } from "@/components/shared/category-icon";
import { Logo } from "./logo";
import { SearchBox } from "./search-box";
import { CartButton } from "./cart-button";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";
import { MobileSearch } from "./mobile-search";

export function Header({ settings, tree }: { settings: PublicSettings; tree: CategoryNode[] }) {
  const t = useTranslations("header");
  const locale = useLocale();
  const name = (c: { nameFr: string; nameAr: string }) => (locale === "ar" ? c.nameAr : c.nameFr);
  const menu = tree.filter((c) => c.showInMenu);
  const announcement = settings.announcement;
  const announcementText = locale === "ar" ? announcement.textAr : announcement.textFr;

  return (
    <>
      {announcement.enabled && announcementText && (
        <div className="bg-navy text-white">
          <div className="container-page flex h-9 items-center justify-center text-center text-xs font-medium sm:text-[13px]">
            {announcement.link ? (
              <a href={announcement.link} className="truncate hover:underline">
                {announcementText}
              </a>
            ) : (
              <p className="truncate">{announcementText}</p>
            )}
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="hidden border-b border-border/60 lg:block">
          <div className="container-page flex h-9 items-center justify-between text-[13px] text-muted-foreground">
            <div className="flex items-center gap-5">
              {settings.phone && (
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:text-primary">
                  <Phone className="size-3.5" /> {t("callUs")} : <span dir="ltr">{settings.phone}</span>
                </a>
              )}
              <span>{locale === "ar" ? settings.businessHoursAr : settings.businessHoursFr}</span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/track-order" className="flex items-center gap-1.5 hover:text-primary">
                <Package className="size-3.5" /> {t("trackOrder")}
              </Link>
              <Link href="/contact" className="hover:text-primary">
                {t("contact")}
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        <div className="container-page flex h-16 items-center gap-2 sm:gap-4 lg:h-[76px]">
          <MobileMenu tree={tree} phone={settings.phone} />
          <Link href="/" className="shrink-0" aria-label="Electro-Ikram">
            <Logo logo={settings.logo} />
          </Link>
          <SearchBox className="mx-auto hidden max-w-2xl md:block" />
          <div className="ms-auto flex items-center gap-1 md:ms-0">
            <MobileSearch />
            <div className="hidden sm:block lg:hidden">
              <LanguageSwitcher className="px-2" />
            </div>
            <CartButton />
          </div>
        </div>

        <nav className="hidden border-t border-border/60 lg:block" aria-label={t("allCategories")}>
          <div className="container-page flex h-12 items-center gap-1">
            <div className="group relative">
              <Link
                href="/products"
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground"
              >
                <LayoutGrid className="size-4" /> {t("allCategories")}
                <ChevronDown className="size-3.5 opacity-80" />
              </Link>
              <div className="invisible absolute start-0 top-full z-50 w-[min(760px,90vw)] translate-y-1 pt-2 opacity-0 transition-all group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="grid grid-cols-2 gap-1 rounded-2xl border bg-popover p-3 shadow-2xl shadow-navy/10 xl:grid-cols-3">
                  {tree.map((c) => (
                    <div key={c._id} className="rounded-xl p-2 hover:bg-accent/60">
                      <Link href={`/category/${c.slug}`} className="flex items-center gap-2.5 text-sm font-semibold hover:text-primary">
                        <span className="grid size-8 place-items-center rounded-lg bg-accent text-primary">
                          <DynamicIcon name={c.icon} className="size-4" />
                        </span>
                        {name(c)}
                      </Link>
                      {c.children.length > 0 && (
                        <ul className="mt-1.5 space-y-1 ps-[2.6rem]">
                          {c.children.slice(0, 5).map((s) => (
                            <li key={s._id}>
                              <Link href={`/category/${s.slug}`} className="text-[13px] text-muted-foreground hover:text-primary">
                                {name(s)}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <ul className="scrollbar-none flex flex-1 items-center gap-0.5 overflow-x-auto">
              {menu.slice(0, 7).map((c) => (
                <li key={c._id} className="shrink-0">
                  <Link
                    href={`/category/${c.slug}`}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground/85 hover:bg-accent hover:text-primary"
                  >
                    {name(c)}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/offers" className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-sale hover:bg-sale/10">
              {t("offers")}
            </Link>
            <Link href="/brands" className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-primary">
              {t("brands")}
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
}
