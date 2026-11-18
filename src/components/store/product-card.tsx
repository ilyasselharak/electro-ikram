import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";
import { ProductImage } from "./product-image";
import { Price } from "./price";
import { AddToCartButton } from "./add-to-cart-button";
import { WishlistButton } from "./account/wishlist-button";
import { Stars } from "./stars";
import { cn } from "@/lib/utils";

export type ProductCardData = FunctionReturnType<typeof api.products.byIds>[number];

const NEW_MS = 1000 * 60 * 60 * 24 * 21;

export function ProductCard({
  product,
  priority,
  className,
  now,
}: {
  product: ProductCardData;
  priority?: boolean;
  className?: string;
  /** Reference time for the "new" badge (pass from the server to stay deterministic). */
  now?: number;
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  const name = locale === "ar" ? product.nameAr : product.nameFr;
  const out = product.stock <= 0;
  const isNew = now !== undefined && now - product._creationTime < NEW_MS;

  return (
    <article
      className={cn(
        "product-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_12px_32px_-12px_rgb(15_27_51/0.18)]",
        className,
      )}
    >
      <Link href={`/product/${product.slug}`} className="relative block" aria-label={name}>
        <ProductImage
          image={product.image}
          alt={name}
          sizes="(min-width:1280px) 300px, (min-width:768px) 33vw, 50vw"
          priority={priority}
          className="aspect-square"
          imgClassName={cn("transition-transform duration-500 group-hover:scale-105", out && "opacity-60")}
        />
        <div className="absolute start-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {product.discount > 0 && (
            <span className="rounded-md bg-sale px-2 py-0.5 text-xs font-bold text-white tabular-nums" dir="ltr">
              -{product.discount}%
            </span>
          )}
          {product.isBestSeller && (
            <span className="rounded-md bg-navy px-2 py-0.5 text-[11px] font-semibold text-white">{t("bestSeller")}</span>
          )}
          {isNew && !product.isBestSeller && (
            <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{t("new")}</span>
          )}
        </div>
      </Link>
      <WishlistButton productId={product._id} className="absolute end-2.5 top-2.5 z-10" />

      <div className="flex flex-1 flex-col gap-2 border-t border-border/60 p-3.5 sm:p-4">
        {product.brand && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{product.brand.name}</span>
        )}
        <h3 className="line-clamp-2 min-h-[2.6em] text-sm font-medium leading-snug text-foreground">
          <Link href={`/product/${product.slug}`} className="hover:text-primary">
            {name}
          </Link>
        </h3>
        {product.ratingCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Stars value={product.ratingAvg} size="xs" />
            <span className="tabular-nums">({product.ratingCount})</span>
          </span>
        )}
        <Price price={product.price} oldPrice={product.oldPrice} locale={locale} size="sm" />
        <p
          className={cn(
            "text-xs font-medium",
            out ? "text-destructive" : product.lowStock ? "text-warning" : "text-success",
          )}
        >
          {out ? t("outOfStock") : product.lowStock ? t("lowStock", { count: product.stock }) : t("inStock")}
        </p>
        <div className="mt-auto pt-1">
          <AddToCartButton product={product} compact />
        </div>
      </div>
    </article>
  );
}
