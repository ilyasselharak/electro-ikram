import { ProductCard, type ProductCardData } from "./product-card";
import { cn } from "@/lib/utils";

export function ProductGrid({ products, now, priorityCount = 0, className }: { products: ProductCardData[]; now?: number; priorityCount?: number; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4", className)}>
      {products.map((p, i) => (
        <li key={p._id}>
          <ProductCard product={p} now={now} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

/** Horizontal scroll rail on mobile, grid on desktop. */
export function ProductRail({ products, now }: { products: ProductCardData[]; now?: number }) {
  return (
    <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p._id} className="w-[46%] shrink-0 snap-start sm:w-auto">
          <ProductCard product={p} now={now} />
        </li>
      ))}
    </ul>
  );
}
