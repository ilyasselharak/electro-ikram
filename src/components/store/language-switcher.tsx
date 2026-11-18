"use client";

import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Switches language while staying on the equivalent page (query string preserved). */
export function LanguageSwitcher({ className, variant = "ghost" }: { className?: string; variant?: "ghost" | "pill" }) {
  const locale = useLocale();
  const t = useTranslations("header");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const target = locale === "fr" ? "ar" : "fr";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          const search = typeof window !== "undefined" ? window.location.search : "";
          router.replace(`${pathname}${search}`, { locale: target, scroll: false });
        })
      }
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-60",
        variant === "pill"
          ? "rounded-full border border-border px-3 py-1.5 hover:border-primary hover:text-primary"
          : "hover:text-primary",
        className,
      )}
      lang={target}
      aria-label={t("switchTo")}
    >
      <Globe className="size-4" aria-hidden />
      <span>{t("switchTo")}</span>
    </button>
  );
}
