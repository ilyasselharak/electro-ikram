"use client";

import { useMutation } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";

export function NewsletterForm({ className, dark }: { className?: string; dark?: boolean }) {
  const t = useTranslations();
  const locale = useLocale() as "fr" | "ar";
  const subscribe = useMutation(api.messages.subscribe);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className={cn("flex w-full max-w-md gap-2", className)}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
          toast.error(t("validation.email"));
          return;
        }
        setLoading(true);
        try {
          const res = await subscribe({ email, locale });
          toast.success(res.alreadySubscribed ? t("newsletter.already") : t("newsletter.success"));
          setEmail("");
        } catch {
          toast.error(t("common.error"));
        } finally {
          setLoading(false);
        }
      }}
    >
      <label className="sr-only" htmlFor="newsletter-email">
        {t("newsletter.placeholder")}
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("newsletter.placeholder")}
        className={cn(
          "h-12 min-w-0 flex-1 rounded-xl border px-4 text-[15px] outline-none transition focus:ring-4",
          dark
            ? "border-white/15 bg-white/10 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/10"
            : "border-input bg-white focus:border-primary focus:ring-primary/10",
        )}
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {t("newsletter.subscribe")}
      </button>
    </form>
  );
}
