"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Heart, Loader2, LogOut, MapPin, Package, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { Link, useRouter } from "@/i18n/navigation";
import { useAccount } from "@/hooks/use-account";
import { errorMessage } from "@/lib/convex-errors";
import { formatDate, formatPrice } from "@/lib/format";
import { MOROCCAN_CITIES } from "@/lib/morocco";
import { Field, inputClass } from "@/components/shared/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGrid } from "../product-grid";
import { OrderItems, OrderTimeline } from "../order-view";
import { cn } from "@/lib/utils";

type Me = NonNullable<FunctionReturnType<typeof api.account.me>>;
type Address = Me["addresses"][number];
const TABS = ["orders", "wishlist", "addresses", "profile"] as const;
type Tab = (typeof TABS)[number];
const ICONS = { orders: Package, wishlist: Heart, addresses: MapPin, profile: UserRound };

export function AccountDashboard() {
  const t = useTranslations("account");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const me = useAccount();
  const { signOut } = useAuthActions();
  const initial = params.get("tab");
  const [tab, setTab] = useState<Tab>(TABS.includes(initial as Tab) ? (initial as Tab) : "orders");

  if (me === undefined) return <Skeleton className="h-[480px] rounded-3xl" />;
  if (me === null) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-16 text-center">
        <UserRound className="size-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">{t("loginRequired")}</p>
        <Link href="/account/login?next=/account" className={buttonVariants({ className: "mt-6 h-11 rounded-xl px-6" })}>
          {t("title")}
        </Link>
      </div>
    );
  }

  const choose = (next: Tab) => {
    setTab(next);
    window.history.replaceState(null, "", `?tab=${next}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-2xl bg-navy p-5 text-white">
          <span className="grid size-12 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {(me.name[0] ?? "?").toUpperCase()}
          </span>
          <p className="mt-3 font-bold">{t("hello", { name: me.name.split(/\s+/)[0] })}</p>
          <p className="truncate text-sm text-white/70" dir="ltr">{me.email}</p>
          <p className="mt-1 text-xs text-white/50">{t("memberSince", { date: formatDate(me.createdAt, locale) })}</p>
        </div>
        <nav className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label={t("title")}>
          {TABS.map((key) => {
            const Icon = ICONS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => choose(key)}
                aria-current={tab === key ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
                  tab === key ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-accent hover:text-primary",
                )}
              >
                <Icon className="size-4" /> {t(`tabs.${key}`)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
            className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" /> {t("logout")}
          </button>
        </nav>
      </aside>

      <section className="min-w-0">
        {tab === "orders" && <OrdersTab />}
        {tab === "wishlist" && <WishlistTab />}
        {tab === "addresses" && <AddressesTab addresses={me.addresses} defaultName={me.name} defaultPhone={me.phone} />}
        {tab === "profile" && <ProfileTab me={me} />}
      </section>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Package; text: string }) {
  const t = useTranslations("account");
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-16 text-center">
      <Icon className="size-12 text-muted-foreground/50" />
      <p className="mt-4 text-muted-foreground">{text}</p>
      <Link href="/products" className={buttonVariants({ className: "mt-6 h-11 rounded-xl px-6" })}>
        {t("startShopping")}
      </Link>
    </div>
  );
}

function OrdersTab() {
  const t = useTranslations();
  const locale = useLocale();
  const orders = useQuery(api.account.myOrders);
  const [open, setOpen] = useState<string | null>(null);
  if (orders === undefined) return <Skeleton className="h-64 rounded-2xl" />;
  if (!orders.length) return <Empty icon={Package} text={t("account.noOrders")} />;
  return (
    <ul className="space-y-3">
      {orders.map((o) => {
        const expanded = open === o.orderNumber;
        const count = o.items.reduce((s, i) => s + i.quantity, 0);
        return (
          <li key={o.orderNumber} className="overflow-hidden rounded-2xl border bg-white">
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : o.orderNumber)}
              aria-expanded={expanded}
              className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-start hover:bg-secondary/40 sm:p-5"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-navy" dir="ltr">{o.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {t("account.orderOf", { date: formatDate(o.createdAt, locale) })} · {t("account.items", { count })}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  o.status === "delivered" ? "bg-success/15 text-success" : o.status === "cancelled" || o.status === "returned" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
                )}
              >
                {t(`order.statuses.${o.status}`)}
              </span>
              <span className="w-28 text-end font-bold tabular-nums">{formatPrice(o.total, locale)}</span>
              <ChevronDown className={cn("size-4 text-muted-foreground transition", expanded && "rotate-180")} />
            </button>
            {expanded && (
              <div className="grid gap-6 border-t p-4 sm:p-5 md:grid-cols-[1fr_240px]">
                <OrderItems order={o} />
                <OrderTimeline order={o} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function WishlistTab() {
  const t = useTranslations("wishlist");
  const items = useQuery(api.wishlist.list);
  if (items === undefined) return <Skeleton className="h-64 rounded-2xl" />;
  if (!items.length) return <Empty icon={Heart} text={t("empty")} />;
  return <ProductGrid products={items} className="lg:grid-cols-3" />;
}

const emptyAddress = (name: string, phone: string) => ({ label: "", fullName: name, phone, city: "", address: "", isDefault: false });

function AddressesTab({ addresses, defaultName, defaultPhone }: { addresses: Address[]; defaultName: string; defaultPhone: string }) {
  const t = useTranslations("account");
  const tc = useTranslations("checkout");
  const save = useMutation(api.account.saveAddress);
  const remove = useMutation(api.account.removeAddress);
  const [editing, setEditing] = useState<{ id?: string; values: ReturnType<typeof emptyAddress> } | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setPending(true);
    try {
      await save({ id: editing.id, ...editing.values, label: editing.values.label || undefined });
      toast.success(t("saved"));
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (editing) {
    const v = editing.values;
    const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEditing((cur) => cur && { ...cur, values: { ...cur.values, [k]: e.target.value } });
    return (
      <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-5 sm:p-7">
        <h2 className="text-lg font-bold text-navy">{editing.id ? t("editAddress") : t("addAddress")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("label")} htmlFor="label">
            <input id="label" value={v.label} onChange={set("label")} className={inputClass} />
          </Field>
          <Field label={t("phone")} htmlFor="phone" required>
            <input id="phone" type="tel" dir="ltr" value={v.phone} onChange={set("phone")} className={`${inputClass} rtl:text-right`} />
          </Field>
          <Field label={tc("fullName")} htmlFor="fullName" required>
            <input id="fullName" value={v.fullName} onChange={set("fullName")} className={inputClass} />
          </Field>
          <Field label={tc("city")} htmlFor="city" required>
            <input id="city" list="cities" value={v.city} onChange={set("city")} className={inputClass} />
            <datalist id="cities">{MOROCCAN_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label={tc("address")} htmlFor="address" required className="sm:col-span-2">
            <textarea id="address" rows={2} value={v.address} onChange={set("address")} className={`${inputClass} h-auto py-2.5`} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={v.isDefault} onChange={(e) => setEditing((cur) => cur && { ...cur, values: { ...cur.values, isDefault: e.target.checked } })} className="size-4 accent-[var(--primary)]" />
          {t("makeDefault")}
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="rounded-xl">
            {pending && <Loader2 className="size-4 animate-spin" />} {t("save")}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditing(null)}>{t("cancel")}</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">{t("noAddresses")}</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className={cn("rounded-2xl border bg-white p-5", a.isDefault && "border-primary ring-1 ring-primary")}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-navy">{a.label || a.city}</p>
              {a.isDefault && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{t("default")}</span>}
            </div>
            <p className="mt-2 text-sm">{a.fullName}</p>
            <p className="text-sm text-muted-foreground">{a.address}, {a.city}</p>
            <p className="text-sm text-muted-foreground" dir="ltr">{a.phone}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditing({ id: a.id, values: { ...a, label: a.label ?? "" } })}>
                <Pencil className="size-3.5" /> {t("edit")}
              </Button>
              <Button size="sm" variant="ghost" className="rounded-lg text-destructive hover:text-destructive" onClick={() => remove({ id: a.id }).catch((e) => toast.error(errorMessage(e)))}>
                <Trash2 className="size-3.5" /> {t("delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {addresses.length < 5 && (
        <Button variant="outline" className="rounded-xl" onClick={() => setEditing({ values: emptyAddress(defaultName, defaultPhone) })}>
          <Plus className="size-4" /> {t("addAddress")}
        </Button>
      )}
    </div>
  );
}

function ProfileTab({ me }: { me: Me }) {
  const t = useTranslations("account");
  const tc = useTranslations("checkout");
  const update = useMutation(api.account.updateProfile);
  const changePassword = useAction(api.account.changePassword);
  const ta = useTranslations("auth");
  const [profile, setProfile] = useState({ name: me.name, phone: me.phone });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pending, setPending] = useState<"profile" | "password" | null>(null);

  const run = async (kind: "profile" | "password", fn: () => Promise<unknown>, ok: string) => {
    setPending(kind);
    try {
      await fn();
      toast.success(ok);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form
        className="space-y-4 rounded-2xl border bg-white p-5 sm:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          void run("profile", () => update({ name: profile.name, phone: profile.phone || undefined }), t("saved"));
        }}
      >
        <h2 className="text-lg font-bold text-navy">{t("profileTitle")}</h2>
        <Field label={tc("fullName")} htmlFor="p-name" required>
          <input id="p-name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className={inputClass} />
        </Field>
        <Field label={t("phone")} htmlFor="p-phone">
          <input id="p-phone" type="tel" dir="ltr" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} className={`${inputClass} rtl:text-right`} />
        </Field>
        <Field label="E-mail" htmlFor="p-email">
          <input id="p-email" value={me.email} disabled dir="ltr" className={`${inputClass} bg-secondary rtl:text-right`} />
        </Field>
        <Button type="submit" disabled={pending === "profile"} className="rounded-xl">
          {pending === "profile" && <Loader2 className="size-4 animate-spin" />} {t("save")}
        </Button>
      </form>
      <form
        className="space-y-4 rounded-2xl border bg-white p-5 sm:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          void run("password", async () => {
            await changePassword({ currentPassword: pw.current, newPassword: pw.next });
            setPw({ current: "", next: "" });
          }, t("passwordChanged"));
        }}
      >
        <h2 className="text-lg font-bold text-navy">{t("passwordTitle")}</h2>
        <Field label={t("currentPassword")} htmlFor="pw-current" required>
          <input id="pw-current" type="password" autoComplete="current-password" dir="ltr" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} className={inputClass} />
        </Field>
        <Field label={t("newPassword")} htmlFor="pw-next" hint={ta("passwordHint")} required>
          <input id="pw-next" type="password" autoComplete="new-password" dir="ltr" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} className={inputClass} />
        </Field>
        <Button type="submit" disabled={pending === "password" || !pw.current || !pw.next} className="rounded-xl">
          {pending === "password" && <Loader2 className="size-4 animate-spin" />} {t("save")}
        </Button>
      </form>
    </div>
  );
}
