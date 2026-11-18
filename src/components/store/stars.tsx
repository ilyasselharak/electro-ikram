import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star rating (supports halves visually via fill width). */
export function Stars({ value, size = "sm", className }: { value: number; size?: "xs" | "sm" | "md"; className?: string }) {
  const px = size === "xs" ? "size-3" : size === "sm" ? "size-4" : "size-5";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className={cn("relative inline-block", px)}>
            <Star className={cn(px, "text-amber-400/30")} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-y-0 start-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn(px, "text-amber-400")} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
