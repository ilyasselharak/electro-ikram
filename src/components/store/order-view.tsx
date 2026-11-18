"use client";

import { useLocale, useTranslations } from "next-intl";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";
import { Check, Circle, X } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/format";
import { ProductImage } from "./product-image";
import { cn } from "@/lib/utils";

type Order = NonNullable<FunctionReturnType<typeof api.orders.track>>;

const FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;

export function OrderTimeline({ order }: { order: Order }) {
  const t = useTranslations("order");
  const locale = useLocale();
  const terminal = order.status === "cancelled" || order.status === "returned";
  const reachedIdx = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  const at = (s: string) => [...order.history].reverse().find((h) => h.status === s)?.at;
  return (
    <ol>
      {FLOW.map((s, i) => {
        const done = !terminal && i <= reachedIdx;
        const time = at(s);
        return (
          <li key={s} className="relative flex gap-3 pb-6 last:pb-0">
            {i < FLOW.length - 1 && (
              <span className={cn("absolute start-[11px] top-6 h-full w-0.5", done && i < reachedIdx ? "bg-success" : "bg-border")} />
            )}
            <span
              className={cn(
                "relative grid size-6 shrink-0 place-items-center rounded-full",
                done ? "bg-success text-white" : "border-2 border-border bg-white text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : <Circle className="size-2" />}
            </span>
            <div>
              <p className={cn("text-sm font-semibold", done ? "text-navy" : "text-muted-foreground")}>{t(`statuses.${s}`)}</p>
              {time && done && <p className="text-xs text-muted-foreground">{formatDate(time, locale, true)}</p>}
            </div>
          </li>
        );
      })}
      {terminal && (
        <li className="mt-4 flex items-center gap-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <X className="size-4" /> {t(`statuses.${order.status}`)}
          {at(order.status) && <span className="font-normal">· {formatDate(at(order.status)!, locale, true)}</span>}
        </li>
      )}
    </ol>
  );
}

export function OrderItems({ order }: { order: Order }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <div>
      <ul className="divide-y">
        {order.items.map((i, idx) => (
          <li key={idx} className="flex items-center gap-3 py-3">
            <ProductImage image={i.image} alt="" sizes="56px" className="size-14 shrink-0 rounded-lg border" imgClassName="p-1" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium">{locale === "ar" ? i.nameAr : i.nameFr}</p>
              <p className="text-xs text-muted-foreground">
                {i.quantity} × {formatPrice(i.price, locale)}
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums">{formatPrice(i.lineTotal, locale)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1.5 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("cart.subtotal")}</dt>
          <dd className="tabular-nums">{formatPrice(order.subtotal, locale)}</dd>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-success">
            <dt>
              {t("cart.discount")} {order.couponCode && `(${order.couponCode})`}
            </dt>
            <dd className="tabular-nums">−{formatPrice(order.discount, locale)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("cart.delivery")}</dt>
          <dd className="tabular-nums">{order.deliveryFee === 0 ? t("common.free") : formatPrice(order.deliveryFee, locale)}</dd>
        </div>
        <div className="flex justify-between pt-1.5 text-base font-bold text-navy">
          <dt>{t("cart.total")}</dt>
          <dd className="tabular-nums">{formatPrice(order.total, locale)}</dd>
        </div>
      </dl>
    </div>
  );
}
