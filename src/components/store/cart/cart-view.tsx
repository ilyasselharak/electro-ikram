"use client";

import { useLocale, useTranslations } from "next-intl";
import { ShoppingBag, Trash2, ShieldCheck } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { MAX_QTY, cartCount, useCart } from "@/stores/cart";
import { useCartTotals } from "@/hooks/use-cart-totals";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "../product-image";
import { QuantityInput } from "../product/quantity-input";
import { CouponField, TotalsBlock } from "./order-summary";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function CartView() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const totals = useCartTotals();
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);

  if (!totals.hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!totals.items.length) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-20 text-center">
        <div className="grid size-20 place-items-center rounded-2xl bg-accent text-primary">
          <ShoppingBag className="size-9" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-navy">{t("cart.empty")}</h2>
        <p className="mt-2 max-w-sm text-muted-foreground">{t("cart.emptyText")}</p>
        <Link href="/products" className={buttonVariants({ size: "lg", className: "mt-8 h-11 rounded-xl px-6" })}>
          {t("cart.continue")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
      <section aria-label={t("cart.title")} className="rounded-2xl border">
        <p className="border-b px-5 py-4 text-sm text-muted-foreground">{t("cart.items", { count: cartCount(totals.items) })}</p>
        <ul className="divide-y">
          {totals.items.map((item) => {
            const name = locale === "ar" ? item.nameAr : item.nameFr;
            return (
              <li key={item.productId} className="flex gap-4 p-4 sm:p-5">
                <Link href={`/product/${item.slug}`} className="shrink-0">
                  <ProductImage image={item.image} alt={name} sizes="96px" className="size-20 rounded-xl border sm:size-24" imgClassName="p-1.5" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <Link href={`/product/${item.slug}`} className="line-clamp-2 font-medium hover:text-primary">
                      {name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">{item.sku}</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{formatPrice(item.price, locale)}</p>
                    {item.stock <= 5 && <p className="text-xs text-warning">{t("common.lowStock", { count: item.stock })}</p>}
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <QuantityInput size="sm" value={item.quantity} max={Math.min(item.stock, MAX_QTY)} onChange={(n) => setQuantity(item.productId, n)} />
                    <p className="font-bold text-navy tabular-nums">{formatPrice(item.price * item.quantity, locale)}</p>
                    <button
                      type="button"
                      onClick={() => remove(item.productId)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" /> {t("cart.remove")}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <aside className="space-y-5 rounded-2xl border p-5 lg:sticky lg:top-40">
        <h2 className="text-lg font-bold text-navy">{t("cart.summary")}</h2>
        <CouponField totals={totals} />
        <TotalsBlock totals={totals} />
        <Button
          size="lg"
          className="h-12 w-full rounded-xl text-base font-semibold"
          disabled={totals.belowMin || totals.syncing}
          onClick={() => router.push("/checkout")}
        >
          {t("cart.checkout")}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-success" /> {t("cart.secure")}
        </p>
        <Link href="/products" className="block text-center text-sm font-medium text-primary hover:underline">
          {t("cart.continue")}
        </Link>
      </aside>
    </div>
  );
}
