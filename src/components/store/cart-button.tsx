"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cartCount, useCart } from "@/stores/cart";
import { useHydrated } from "@/hooks/use-hydrated";

export function CartButton() {
  const t = useTranslations("header");
  const items = useCart((s) => s.items);
  const hydrated = useHydrated();
  const count = hydrated ? cartCount(items) : 0;
  return (
    <Link
      href="/cart"
      className="relative inline-flex size-11 items-center justify-center rounded-xl text-navy transition-colors hover:bg-accent hover:text-primary"
      aria-label={`${t("cart")} (${count})`}
    >
      <ShoppingBag className="size-[22px]" />
      {count > 0 && (
        <span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-5 text-primary-foreground ring-2 ring-white tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
