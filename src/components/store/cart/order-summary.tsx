"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Tag, X, Truck } from "lucide-react";
import { useCart } from "@/stores/cart";
import { formatPrice } from "@/lib/format";
import type { useCartTotals } from "@/hooks/use-cart-totals";

type Totals = ReturnType<typeof useCartTotals>;

export function CouponField({ totals }: { totals: Totals }) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const setCoupon = useCart((s) => s.setCoupon);
  const [code, setCode] = useState("");
  const { coupon, couponCode } = totals;

  if (couponCode && coupon?.valid) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success/5 px-3.5 py-2.5 text-sm">
        <span className="flex items-center gap-2 font-medium text-success">
          <Tag className="size-4" /> {t("couponApplied", { code: coupon.code })}
        </span>
        <button type="button" onClick={() => setCoupon(null)} className="text-muted-foreground hover:text-destructive" aria-label={t("removeCoupon")}>
          <X className="size-4" />
        </button>
      </div>
    );
  }

  const error =
    couponCode && coupon && !coupon.valid
      ? t(`couponErrors.${coupon.reason}`, { amount: formatPrice(coupon.minOrderAmount ?? 0, locale) })
      : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) setCoupon(code.trim().toUpperCase());
      }}
      className="space-y-1.5"
    >
      <label htmlFor="coupon" className="text-sm font-medium">
        {t("coupon")}
      </label>
      <div className="flex gap-2">
        <input
          id="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t("couponPlaceholder")}
          className="h-11 min-w-0 flex-1 rounded-xl border border-input px-3.5 text-sm uppercase outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          autoComplete="off"
        />
        <button type="submit" className="h-11 rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy/90">
          {t("apply")}
        </button>
      </div>
      {error && (
        <p className="flex items-center justify-between text-xs text-destructive">
          {error}
          <button type="button" className="underline" onClick={() => setCoupon(null)}>
            {t("removeCoupon")}
          </button>
        </p>
      )}
    </form>
  );
}

export function TotalsBlock({ totals }: { totals: Totals }) {
  const t = useTranslations("cart");
  const tc = useTranslations("common");
  const locale = useLocale();
  return (
    <div className="space-y-3">
      {totals.freeThreshold > 0 && (
        <div className="rounded-xl bg-accent/70 p-3">
          <p className="flex items-center gap-2 text-xs font-medium text-accent-foreground">
            <Truck className="size-4" />
            {totals.remainingForFree > 0
              ? t("freeDeliveryProgress", { amount: formatPrice(totals.remainingForFree, locale) })
              : t("freeDeliveryReached")}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, ((totals.freeThreshold - totals.remainingForFree) / totals.freeThreshold) * 100)}%` }}
            />
          </div>
        </div>
      )}
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("subtotal")}</dt>
          <dd className="font-medium tabular-nums">{formatPrice(totals.subtotal, locale)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-success">
            <dt>{t("discount")}</dt>
            <dd className="font-medium tabular-nums">−{formatPrice(totals.discount, locale)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("delivery")}</dt>
          <dd className="font-medium tabular-nums">{totals.deliveryFee === 0 ? tc("free") : formatPrice(totals.deliveryFee, locale)}</dd>
        </div>
        <div className="flex justify-between border-t pt-3 text-base">
          <dt className="font-bold text-navy">{t("total")}</dt>
          <dd className="text-xl font-extrabold text-navy tabular-nums">{formatPrice(totals.total, locale)}</dd>
        </div>
      </dl>
      {totals.belowMin && totals.minOrderAmount && (
        <p className="rounded-lg bg-warning/15 px-3 py-2 text-xs font-medium text-foreground">
          {t("minOrder", { amount: formatPrice(totals.minOrderAmount, locale) })}
        </p>
      )}
    </div>
  );
}
