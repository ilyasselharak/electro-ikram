"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, Loader2, Lock, MapPin, ShoppingBag, UserRound } from "lucide-react";
import { useAccount } from "@/hooks/use-account";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/stores/cart";
import { useCartTotals } from "@/hooks/use-cart-totals";
import { errorData } from "@/lib/convex-errors";
import { formatPrice } from "@/lib/format";
import { MOROCCAN_CITIES, PHONE_RE } from "@/lib/morocco";
import { Field, inputClass } from "@/components/shared/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "../product-image";
import { CouponField, TotalsBlock } from "./order-summary";

export function CheckoutForm() {
  const t = useTranslations();
  const locale = useLocale() as "fr" | "ar";
  const router = useRouter();
  const totals = useCartTotals();
  const clear = useCart((s) => s.clear);
  const setCoupon = useCart((s) => s.setCoupon);
  const createOrder = useMutation(api.orders.create);
  const saveAddress = useMutation(api.account.saveAddress);
  const me = useAccount();
  const [submitting, setSubmitting] = useState(false);
  // undefined = untouched: the default saved address (pre-filled below) counts as selected.
  const [chosenAddress, setAddressId] = useState<string | null | undefined>(undefined);
  const defaultAddress = me ? (me.addresses.find((x) => x.isDefault) ?? me.addresses[0]) : undefined;
  const addressId = chosenAddress === undefined ? (defaultAddress?.id ?? null) : chosenAddress;
  const [saveToAccount, setSaveToAccount] = useState(true);

  const schema = z.object({
    fullName: z.string().trim().min(3, t("validation.min", { count: 3 })).max(120, t("validation.max", { count: 120 })),
    phone: z.string().trim().regex(PHONE_RE, t("validation.phone")),
    city: z.string().trim().min(2, t("validation.required")).max(80),
    address: z.string().trim().min(8, t("validation.min", { count: 8 })).max(400),
    email: z.union([z.literal(""), z.email(t("validation.email"))]).optional(),
    notes: z.string().max(1000, t("validation.max", { count: 1000 })).optional(),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", phone: "", city: "", address: "", email: "", notes: "" },
    mode: "onTouched",
  });
  const { register, handleSubmit, formState } = form;
  const err = formState.errors;

  // Signed-in customers: pre-fill once with their default address and profile.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!me || prefilled.current) return;
    prefilled.current = true;
    const a = me.addresses.find((x) => x.isDefault) ?? me.addresses[0];
    const cur = form.getValues();
    form.reset({
      ...cur,
      fullName: cur.fullName || a?.fullName || me.name,
      phone: cur.phone || a?.phone || me.phone,
      city: cur.city || a?.city || "",
      address: cur.address || a?.address || "",
      email: cur.email || me.email,
    });
  }, [me, form]);

  const pickSaved = (id: string) => {
    const a = me?.addresses.find((x) => x.id === id);
    if (!a) return;
    setAddressId(id);
    form.setValue("fullName", a.fullName, { shouldValidate: true });
    form.setValue("phone", a.phone, { shouldValidate: true });
    form.setValue("city", a.city, { shouldValidate: true });
    form.setValue("address", a.address, { shouldValidate: true });
  };

  if (!totals.hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <Skeleton className="h-[480px] rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!totals.items.length && !submitting) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-20 text-center">
        <ShoppingBag className="size-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">{t("checkout.emptyCart")}</p>
        <Link href="/products" className={buttonVariants({ className: "mt-6 h-11 rounded-xl px-6" })}>
          {t("cart.continue")}
        </Link>
      </div>
    );
  }

  const onSubmit = async (values: Values) => {
    setSubmitting(true);
    try {
      const res = await createOrder({
        customer: {
          fullName: values.fullName,
          phone: values.phone,
          city: values.city,
          address: values.address,
          email: values.email || undefined,
        },
        notes: values.notes || undefined,
        items: totals.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        couponCode: totals.coupon?.valid ? totals.couponCode ?? undefined : undefined,
        locale,
      });
      // Remember a new address in the account (best effort, never blocks the order).
      if (me && saveToAccount && !addressId && me.addresses.length < 5) {
        saveAddress({ fullName: values.fullName, phone: values.phone, city: values.city, address: values.address }).catch(() => {});
      }
      router.replace(`/order-confirmation?n=${encodeURIComponent(res.orderNumber)}&t=${res.accessToken}`);
      clear();
    } catch (e) {
      const data = errorData(e);
      const code = data.code as string | undefined;
      if (code === "COUPON_INVALID") setCoupon(null);
      if (code === "INVALID_PHONE") form.setError("phone", { message: t("validation.phone") });
      const known = ["OUT_OF_STOCK", "UNAVAILABLE", "COUPON_INVALID", "MIN_ORDER", "RATE_LIMITED", "BLOCKED", "INVALID_PHONE", "INVALID_EMAIL"];
      toast.error(t(`checkout.errors.${code && known.includes(code) ? code : "generic"}`));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid items-start gap-8 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        {me === null && (
          <Link
            href="/account/login?next=/checkout"
            className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-accent/60 p-4 text-sm hover:border-primary/50"
          >
            <UserRound className="size-5 shrink-0 text-primary" />
            <span className="flex-1">{t("account.loginForFaster")}</span>
            <span className="font-semibold text-primary">{t("header.login")}</span>
          </Link>
        )}
        <section className="rounded-2xl border p-5 sm:p-7">
          <h2 className="text-lg font-bold text-navy">{t("checkout.contactInfo")}</h2>
          {me && <p className="mt-1 text-sm text-muted-foreground">{t("account.signedInAs", { email: me.email })}</p>}
          {me && me.addresses.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">{t("account.useAddress")}</p>
              <div className="flex flex-wrap gap-2">
                {me.addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => pickSaved(a.id)}
                    aria-pressed={addressId === a.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-start text-sm transition",
                      addressId === a.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/40",
                    )}
                  >
                    <MapPin className="size-4 shrink-0 text-primary" />
                    <span>
                      <span className="block font-semibold">{a.label || a.city}</span>
                      <span className="block max-w-48 truncate text-xs text-muted-foreground">{a.address}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label={t("checkout.fullName")} htmlFor="fullName" error={err.fullName?.message} required className="sm:col-span-2">
              <input id="fullName" autoComplete="name" className={inputClass} aria-invalid={!!err.fullName} {...register("fullName")} />
            </Field>
            <Field label={t("checkout.phone")} htmlFor="phone" error={err.phone?.message} hint={t("checkout.phoneHint")} required>
              <input id="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className={`${inputClass} rtl:text-right`} aria-invalid={!!err.phone} {...register("phone")} />
            </Field>
            <Field label={t("checkout.city")} htmlFor="city" error={err.city?.message} required>
              <input id="city" list="cities" autoComplete="address-level2" className={inputClass} aria-invalid={!!err.city} {...register("city")} />
              <datalist id="cities">
                {MOROCCAN_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label={t("checkout.address")} htmlFor="address" error={err.address?.message} required className="sm:col-span-2">
              <textarea
                id="address"
                onInput={() => setAddressId(null)}
                rows={2}
                autoComplete="street-address"
                placeholder={t("checkout.addressPlaceholder")}
                className={`${inputClass} h-auto py-2.5`}
                aria-invalid={!!err.address}
                {...register("address")}
              />
            </Field>
            {me && !addressId && me.addresses.length < 5 && (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={saveToAccount} onChange={(e) => setSaveToAccount(e.target.checked)} className="size-4 accent-[var(--primary)]" />
                {t("account.saveAddress")}
              </label>
            )}
            <Field label={t("checkout.email")} htmlFor="email" error={err.email?.message} className="sm:col-span-2">
              <input id="email" type="email" autoComplete="email" dir="ltr" className={`${inputClass} rtl:text-right`} aria-invalid={!!err.email} {...register("email")} />
            </Field>
            <Field label={t("checkout.notes")} htmlFor="notes" error={err.notes?.message} className="sm:col-span-2">
              <textarea id="notes" rows={3} placeholder={t("checkout.notesPlaceholder")} className={`${inputClass} h-auto py-2.5`} {...register("notes")} />
            </Field>
          </div>
        </section>
        <section className="rounded-2xl border p-5 sm:p-7">
          <h2 className="text-lg font-bold text-navy">{t("checkout.payment")}</h2>
          <div className="mt-4 flex gap-4 rounded-xl border-2 border-primary bg-primary/5 p-4">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-primary">
              <span className="size-2.5 rounded-full bg-primary" />
            </span>
            <div>
              <p className="flex items-center gap-2 font-semibold text-navy">
                <Banknote className="size-5 text-primary" /> {t("checkout.cod")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{t("checkout.codDesc")}</p>
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-5 rounded-2xl border p-5 lg:sticky lg:top-40">
        <h2 className="text-lg font-bold text-navy">{t("checkout.summary")}</h2>
        <ul className="max-h-72 space-y-3 overflow-y-auto">
          {totals.items.map((i) => (
            <li key={i.productId} className="flex items-center gap-3">
              <div className="relative">
                <ProductImage image={i.image} alt="" sizes="56px" className="size-14 rounded-lg border" imgClassName="p-1" />
                <span className="absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-navy text-[11px] font-bold text-white">{i.quantity}</span>
              </div>
              <p className="line-clamp-2 flex-1 text-sm">{locale === "ar" ? i.nameAr : i.nameFr}</p>
              <p className="text-sm font-semibold tabular-nums">{formatPrice(i.price * i.quantity, locale)}</p>
            </li>
          ))}
        </ul>
        <CouponField totals={totals} />
        <TotalsBlock totals={totals} />
        <Button type="submit" size="lg" disabled={submitting || totals.belowMin || totals.syncing} className="h-12 w-full rounded-xl text-base font-semibold">
          {submitting ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-4" />}
          {submitting ? t("checkout.placing") : t("checkout.placeOrder")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {t("checkout.agree")}{" "}
          <Link href="/terms" className="underline">
            {t("pages.terms")}
          </Link>
        </p>
      </aside>
    </form>
  );
}
