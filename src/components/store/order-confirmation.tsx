"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { OrderItems, OrderTimeline } from "./order-view";

export function OrderConfirmation() {
  const t = useTranslations();
  const locale = useLocale();
  const [params, setParams] = useState<{ n: string; t: string } | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL after mount
    setParams({ n: sp.get("n") ?? "", t: sp.get("t") ?? "" });
  }, []);
  const order = useQuery(
    api.orders.getConfirmation,
    params?.n && params.t ? { orderNumber: params.n, token: params.t } : "skip",
  );

  if (!params || (params.n && params.t && order === undefined)) {
    return <Skeleton className="mx-auto h-96 max-w-3xl rounded-3xl" />;
  }
  if (!order) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">{t("order.notFound")}</p>
        <Link href="/track-order" className={buttonVariants({ className: "mt-6 rounded-xl" })}>
          {t("order.track")}
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl border bg-gradient-to-b from-success/5 to-white p-6 text-center sm:p-10">
        <CheckCircle2 className="mx-auto size-16 text-success" />
        <h1 className="mt-4 text-2xl font-extrabold text-navy sm:text-3xl">{t("order.confirmedTitle")}</h1>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">{t("order.confirmedText")}</p>
        <div className="mx-auto mt-6 inline-flex flex-col items-center rounded-2xl border-2 border-dashed border-primary/30 bg-white px-8 py-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("order.number")}</span>
          <span className="mt-1 text-2xl font-extrabold tracking-wide text-primary" dir="ltr">
            {order.orderNumber}
          </span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("order.keepNumber")}</p>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border p-5">
          <h2 className="mb-2 font-bold text-navy">{t("order.items")}</h2>
          <OrderItems order={order} />
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border p-5 text-sm">
            <h2 className="mb-3 font-bold text-navy">{t("order.deliveryTo")}</h2>
            <p className="font-medium">{order.customer.fullName}</p>
            <p dir="ltr" className="text-muted-foreground rtl:text-right">
              {order.customer.phone}
            </p>
            <p className="text-muted-foreground">
              {order.customer.address}, {order.customer.city}
            </p>
            <dl className="mt-4 space-y-1 border-t pt-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("order.date")}</dt>
                <dd>{formatDate(order.createdAt, locale, true)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("order.payment")}</dt>
                <dd>{t("checkout.cod")}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-2xl border p-5">
            <h2 className="mb-4 font-bold text-navy">{t("order.status")}</h2>
            <OrderTimeline order={order} />
          </section>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonVariants({ size: "lg", className: "h-11 rounded-xl px-6" })}>
          {t("cart.continue")}
        </Link>
        <Link href="/track-order" className={buttonVariants({ size: "lg", variant: "outline", className: "h-11 rounded-xl px-6" })}>
          {t("order.track")}
        </Link>
      </div>
    </div>
  );
}
