"use client";

import { Heart } from "lucide-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useRouter } from "@/i18n/navigation";
import { errorMessage } from "@/lib/convex-errors";
import { cn } from "@/lib/utils";

/** Heart toggle; signed-out visitors are sent to the login page. */
export function WishlistButton({ productId, className, withLabel }: { productId: string; className?: string; withLabel?: boolean }) {
  const t = useTranslations("wishlist");
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const ids = useQuery(api.wishlist.ids, isAuthenticated ? {} : "skip");
  const toggle = useMutation(api.wishlist.toggle).withOptimisticUpdate((store, { productId: pid }) => {
    const current = store.getQuery(api.wishlist.ids, {});
    if (!current) return;
    store.setQuery(api.wishlist.ids, {}, current.includes(pid) ? current.filter((x) => x !== pid) : [...current, pid]);
  });
  const active = ids?.includes(productId as Id<"products">) ?? false;

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast(t("loginToSave"));
      router.push("/account/login");
      return;
    }
    try {
      const now = await toggle({ productId: productId as Id<"products"> });
      toast.success(now ? t("added") : t("removed"));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? t("remove") : t("add")}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-colors",
        withLabel
          ? "h-12 rounded-xl border px-4 text-sm font-semibold hover:border-sale/40 hover:text-sale"
          : "size-9 rounded-full bg-white/90 shadow-sm ring-1 ring-black/5 backdrop-blur hover:text-sale",
        active ? "text-sale" : "text-navy/70",
        className,
      )}
    >
      <Heart className={cn(withLabel ? "size-5" : "size-[18px]", active && "fill-current")} />
      {withLabel && (active ? t("remove") : t("add"))}
    </button>
  );
}
