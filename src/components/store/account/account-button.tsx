"use client";

import { Heart, UserRound } from "lucide-react";
import { useQuery, useConvexAuth } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@convex/_generated/api";
import { Link } from "@/i18n/navigation";
import { useAccount } from "@/hooks/use-account";

const iconBtn =
  "relative inline-flex size-11 items-center justify-center rounded-xl text-navy transition-colors hover:bg-accent hover:text-primary";

export function WishlistLink() {
  const t = useTranslations("header");
  const { isAuthenticated } = useConvexAuth();
  const ids = useQuery(api.wishlist.ids, isAuthenticated ? {} : "skip");
  const count = ids?.length ?? 0;
  return (
    <Link href={isAuthenticated ? "/account?tab=wishlist" : "/account/login"} className={`${iconBtn} hidden sm:inline-flex`} aria-label={`${t("wishlist")} (${count})`}>
      <Heart className="size-[22px]" />
      {count > 0 && (
        <span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-sale px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-white tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function AccountButton() {
  const t = useTranslations("header");
  const me = useAccount();
  const first = me?.name.trim().split(/\s+/)[0];
  return (
    <Link
      href={me ? "/account" : "/account/login"}
      className={`${iconBtn} lg:w-auto lg:gap-2 lg:px-3`}
      aria-label={me ? t("account") : t("login")}
    >
      {me ? (
        <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {(first?.[0] ?? "?").toUpperCase()}
        </span>
      ) : (
        <UserRound className="size-[22px]" />
      )}
      <span className="hidden max-w-28 truncate text-sm font-semibold lg:inline">{me ? first || t("account") : t("login")}</span>
    </Link>
  );
}
