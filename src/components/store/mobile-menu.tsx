"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Menu, Phone, Package, BadgePercent, Mail, Heart, UserRound } from "lucide-react";
import { useAccount } from "@/hooks/use-account";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import type { CategoryNode } from "@/lib/categories";
import { DynamicIcon } from "@/components/shared/category-icon";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

export function MobileMenu({ tree, phone }: { tree: CategoryNode[]; phone?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const close = () => setOpen(false);
  const me = useAccount();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-xl text-navy hover:bg-accent lg:hidden"
          aria-label={t("header.openMenu")}
        >
          <Menu className="size-6" />
        </button>
      </SheetTrigger>
      <SheetContent side={locale === "ar" ? "right" : "left"} className="w-[88vw] max-w-sm gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto p-3" aria-label={t("header.allCategories")}>
          <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("header.allCategories")}
          </p>
          <ul className="space-y-0.5">
            {tree.map((c) => {
              const name = locale === "ar" ? c.nameAr : c.nameFr;
              const isOpen = expanded === c._id;
              return (
                <li key={c._id}>
                  <div className="flex items-center">
                    <Link
                      href={`/category/${c.slug}`}
                      onClick={close}
                      className="flex flex-1 items-center gap-3 rounded-lg px-2 py-2.5 text-[15px] font-medium hover:bg-accent"
                    >
                      <span className="grid size-8 place-items-center rounded-lg bg-accent text-primary">
                        <DynamicIcon name={c.icon} className="size-4" />
                      </span>
                      {name}
                    </Link>
                    {c.children.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : c._id)}
                        className="rounded-lg p-2.5 text-muted-foreground hover:bg-accent"
                        aria-expanded={isOpen}
                        aria-label={name}
                      >
                        <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <ul className="ms-12 border-s ps-2">
                      {c.children.map((s) => (
                        <li key={s._id}>
                          <Link
                            href={`/category/${s.slug}`}
                            onClick={close}
                            className="block rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            {locale === "ar" ? s.nameAr : s.nameFr}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="my-3 border-t" />
          <ul className="space-y-0.5 text-[15px]">
            <li>
              <Link href={me ? "/account" : "/account/login"} onClick={close} className="flex items-center gap-3 rounded-lg px-2 py-2.5 font-medium hover:bg-accent">
                <UserRound className="size-5 text-muted-foreground" /> {me ? t("header.account") : t("header.login")}
              </Link>
            </li>
            <li>
              <Link href={me ? "/account?tab=wishlist" : "/account/login"} onClick={close} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent">
                <Heart className="size-5 text-muted-foreground" /> {t("header.wishlist")}
              </Link>
            </li>
            <li>
              <Link href="/offers" onClick={close} className="flex items-center gap-3 rounded-lg px-2 py-2.5 font-medium text-sale hover:bg-accent">
                <BadgePercent className="size-5" /> {t("header.offers")}
              </Link>
            </li>
            <li>
              <Link href="/track-order" onClick={close} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent">
                <Package className="size-5 text-muted-foreground" /> {t("header.trackOrder")}
              </Link>
            </li>
            <li>
              <Link href="/contact" onClick={close} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent">
                <Mail className="size-5 text-muted-foreground" /> {t("header.contact")}
              </Link>
            </li>
            {phone && (
              <li>
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent" dir="ltr">
                  <Phone className="size-5 text-muted-foreground" /> {phone}
                </a>
              </li>
            )}
          </ul>
        </nav>
        <div className="border-t p-4">
          <LanguageSwitcher variant="pill" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
