"use client";

import { useLocale, useTranslations } from "next-intl";
import { ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import { useRouter } from "@/i18n/navigation";
import type { ImageAsset } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

export type CartableProduct = {
  _id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  sku: string;
  price: number;
  oldPrice?: number;
  image: ImageAsset | null;
  stock: number;
};

export function toCartItem(p: CartableProduct) {
  return {
    productId: p._id,
    slug: p.slug,
    nameFr: p.nameFr,
    nameAr: p.nameAr,
    sku: p.sku,
    price: p.price,
    oldPrice: p.oldPrice,
    image: p.image,
    stock: p.stock,
  };
}

export function AddToCartButton({
  product,
  quantity = 1,
  compact,
  className,
}: {
  product: CartableProduct;
  quantity?: number;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.items.find((i) => i.productId === product._id)?.quantity ?? 0);
  const [justAdded, setJustAdded] = useState(false);
  const out = product.stock <= 0;

  const onClick = () => {
    if (inCart + quantity > product.stock) {
      if (inCart >= product.stock) {
        toast.warning(t("maxStock"));
        return;
      }
    }
    add(toCartItem(product), quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
    toast.success(t("added"), {
      description: locale === "ar" ? product.nameAr : product.nameFr,
      action: { label: t("viewCart"), onClick: () => router.push("/cart") },
    });
  };

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={out}
      size={compact ? "default" : "lg"}
      className={cn(
        "w-full font-semibold",
        compact ? "h-9 rounded-lg text-[13px]" : "h-12 rounded-xl text-base",
        className,
      )}
      aria-label={`${t("addToCart")} — ${locale === "ar" ? product.nameAr : product.nameFr}`}
    >
      {justAdded ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
      {out ? t("unavailable") : t("addToCart")}
    </Button>
  );
}
