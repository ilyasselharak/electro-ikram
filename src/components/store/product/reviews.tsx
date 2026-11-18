"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, Loader2, MessageSquareReply, Star } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@/i18n/navigation";
import { errorMessage } from "@/lib/convex-errors";
import { formatDate } from "@/lib/format";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Stars } from "../stars";
import { cn } from "@/lib/utils";

export function ProductReviews({ productId, slug }: { productId: string; slug: string }) {
  const t = useTranslations("reviews");
  const locale = useLocale();
  const id = productId as Id<"products">;
  const data = useQuery(api.reviews.forProduct, { productId: id });

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="container-page mt-16 scroll-mt-40">
      <h2 id="reviews-title" className="text-2xl font-bold text-navy">{t("title")}</h2>
      {data === undefined ? (
        <Skeleton className="mt-6 h-48 rounded-2xl" />
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border p-6">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-extrabold text-navy tabular-nums">{data.count ? data.average.toFixed(1) : "–"}</span>
                <div className="pb-1.5">
                  <Stars value={data.average} size="md" />
                  <p className="mt-1 text-sm text-muted-foreground">{t("basedOn", { count: data.count })}</p>
                </div>
              </div>
              <ul className="mt-5 space-y-1.5">
                {data.distribution.map((d) => (
                  <li key={d.stars} className="flex items-center gap-2 text-sm">
                    <span className="w-6 text-end tabular-nums">{d.stars}</span>
                    <Star className="size-3.5 text-amber-400" fill="currentColor" strokeWidth={0} />
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <span className="block h-full rounded-full bg-amber-400" style={{ width: `${data.count ? (d.count / data.count) * 100 : 0}%` }} />
                    </span>
                    <span className="w-8 text-muted-foreground tabular-nums">{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ReviewComposer productId={id} slug={slug} />
          </div>

          {data.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">{t("none")}</p>
          ) : (
            <ul className="space-y-4">
              {data.items.map((r) => (
                <li key={r._id} className="rounded-2xl border p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars value={r.rating} />
                    {r.title && <p className="font-semibold text-navy">{r.title}</p>}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-foreground/85">{r.body}</p>
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{r.author}</span>
                    <span className="inline-flex items-center gap-1 text-success">
                      <BadgeCheck className="size-3.5" /> {t("verified")}
                    </span>
                    <span>· {formatDate(r.createdAt, locale)}</span>
                  </p>
                  {r.adminReply && (
                    <div className="mt-4 rounded-xl bg-secondary/70 p-4 text-sm">
                      <p className="flex items-center gap-1.5 font-semibold text-navy">
                        <MessageSquareReply className="size-4 text-primary" /> {t("storeReply")}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-foreground/85">{r.adminReply}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function ReviewComposer({ productId, slug }: { productId: Id<"products">; slug: string }) {
  const t = useTranslations("reviews");
  const status = useQuery(api.reviews.myStatus, { productId });
  const submit = useMutation(api.reviews.submit);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ rating: number; title: string; body: string } | null>(null);
  const [hover, setHover] = useState(0);
  const [pending, setPending] = useState(false);

  if (status === undefined) return null;
  if (status.state === "signedOut") {
    return (
      <p className="rounded-2xl bg-secondary/60 p-4 text-sm">
        <Link href={`/account/login?next=${encodeURIComponent(`/product/${slug}#reviews`)}`} className="font-semibold text-primary hover:underline">
          {t("signIn")}
        </Link>
      </p>
    );
  }
  if (status.state === "notPurchased") return <p className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">{t("notPurchased")}</p>;

  const mine = status.state === "reviewed" ? status.review : null;
  const value = draft ?? { rating: mine?.rating ?? 0, title: mine?.title ?? "", body: mine?.body ?? "" };

  if (!open) {
    return (
      <div className="space-y-2">
        {mine && (
          <p className={cn("rounded-2xl p-4 text-sm", mine.status === "approved" ? "bg-success/10 text-success" : mine.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-foreground")}>
            {t(mine.status)}
          </p>
        )}
        <Button className="h-11 w-full rounded-xl" variant={mine ? "outline" : "default"} onClick={() => setOpen(true)}>
          <Star className="size-4" /> {mine ? t("editMine") : t("write")}
        </Button>
      </div>
    );
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.rating) return toast.error(t("yourRating"));
    setPending(true);
    try {
      await submit({ productId, rating: value.rating, title: value.title || undefined, body: value.body });
      toast.success(t("submitted"));
      setOpen(false);
      setDraft(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={send} className="space-y-4 rounded-2xl border p-5">
      <div>
        <p className="text-sm font-medium">{t("yourRating")}</p>
        <div className="mt-2 flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label={t("yourRating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value.rating === n}
              aria-label={t("stars", { count: n })}
              onMouseEnter={() => setHover(n)}
              onClick={() => setDraft({ ...value, rating: n })}
              className="rounded p-0.5"
            >
              <Star className={cn("size-8 transition", (hover || value.rating) >= n ? "text-amber-400" : "text-amber-400/25")} fill="currentColor" strokeWidth={0} />
            </button>
          ))}
        </div>
      </div>
      <Field label={t("titleLabel")} htmlFor="rv-title">
        <input id="rv-title" maxLength={120} value={value.title} onChange={(e) => setDraft({ ...value, title: e.target.value })} className={inputClass} />
      </Field>
      <Field label={t("body")} htmlFor="rv-body" required>
        <textarea id="rv-body" rows={4} maxLength={2000} placeholder={t("bodyPlaceholder")} value={value.body} onChange={(e) => setDraft({ ...value, body: e.target.value })} className={`${inputClass} h-auto py-2.5`} />
      </Field>
      <Button type="submit" disabled={pending} className="h-11 w-full rounded-xl">
        {pending && <Loader2 className="size-4 animate-spin" />} {t("submit")}
      </Button>
    </form>
  );
}
