"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function QuantityInput({ value, onChange, max, className, size = "md" }: { value: number; onChange: (n: number) => void; max: number; className?: string; size?: "sm" | "md" }) {
  const t = useTranslations("common");
  const h = size === "sm" ? "h-9" : "h-12";
  return (
    <div className={cn("inline-flex items-center rounded-xl border border-input bg-white", h, className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className={cn("grid place-items-center text-navy disabled:opacity-30", size === "sm" ? "w-8" : "w-11")}
        aria-label={t("decrease")}
      >
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value));
          if (Number.isFinite(n)) onChange(Math.min(Math.max(1, n), Math.max(1, max)));
        }}
        className={cn("w-10 bg-transparent text-center font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none", size === "sm" && "text-sm")}
        aria-label={t("quantity")}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn("grid place-items-center text-navy disabled:opacity-30", size === "sm" ? "w-8" : "w-11")}
        aria-label={t("increase")}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
