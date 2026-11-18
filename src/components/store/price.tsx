import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Price({
  price,
  oldPrice,
  locale,
  size = "md",
  className,
}: {
  price: number;
  oldPrice?: number | null;
  locale: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hasDiscount = !!oldPrice && oldPrice > price;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn(
          "font-bold tabular-nums text-navy",
          size === "sm" && "text-base",
          size === "md" && "text-lg",
          size === "lg" && "text-3xl",
          hasDiscount && "text-sale",
        )}
      >
        {formatPrice(price, locale)}
      </span>
      {hasDiscount && (
        <span className={cn("tabular-nums text-muted-foreground line-through", size === "lg" ? "text-lg" : "text-sm")}>
          {formatPrice(oldPrice!, locale)}
        </span>
      )}
    </div>
  );
}
