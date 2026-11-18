"use client";

import { useState } from "react";
import { useConvex } from "convex/react";
import { useTranslations } from "next-intl";
import { Loader2, PackageSearch } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { OrderItems, OrderTimeline } from "./order-view";

type Tracked = FunctionReturnType<typeof api.orders.track>;

export function TrackOrderForm() {
  const t = useTranslations();
  const convex = useConvex();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Tracked | undefined>(undefined);

  return (
    <div className="mx-auto max-w-3xl">
      <form
        className="grid gap-4 rounded-2xl border p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-7"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!orderNumber.trim() || !phone.trim()) return;
          setLoading(true);
          try {
            setResult(await convex.query(api.orders.track, { orderNumber, phone }));
          } finally {
            setLoading(false);
          }
        }}
      >
        <Field label={t("track.orderNumber")} htmlFor="on">
          <input
            id="on"
            required
            dir="ltr"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder={t("track.orderNumberPlaceholder")}
            className={`${inputClass} uppercase rtl:text-right`}
          />
        </Field>
        <Field label={t("track.phone")} htmlFor="ph">
          <input
            id="ph"
            required
            type="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 12 34 56 78"
            className={`${inputClass} rtl:text-right`}
          />
        </Field>
        <Button type="submit" size="lg" disabled={loading} className="h-11 rounded-xl px-6">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {t("track.submit")}
        </Button>
      </form>
      {result === null && (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed py-12 text-center">
          <PackageSearch className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">{t("track.notFound")}</p>
        </div>
      )}
      {result && (
        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_1.3fr]">
          <section className="rounded-2xl border p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("order.number")}</p>
            <p className="mt-1 text-xl font-extrabold text-primary" dir="ltr">
              {result.orderNumber}
            </p>
            <h2 className="mb-4 mt-6 font-bold text-navy">{t("track.timeline")}</h2>
            <OrderTimeline order={result} />
          </section>
          <section className="rounded-2xl border p-5">
            <h2 className="mb-2 font-bold text-navy">{t("order.items")}</h2>
            <OrderItems order={result} />
          </section>
        </div>
      )}
    </div>
  );
}
