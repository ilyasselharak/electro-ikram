"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { inputClass } from "@/components/shared/field";

type Cat = Doc<"categories">;

/** Flattens categories into an indented, ordered option list. */
export function flattenCategories(list: Cat[]) {
  const byParent = new Map<string, Cat[]>();
  for (const c of list) {
    const key = c.parentId ?? "root";
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const out: { cat: Cat; depth: number }[] = [];
  const walk = (key: string, depth: number) => {
    for (const c of (byParent.get(key) ?? []).sort((a, b) => a.order - b.order)) {
      out.push({ cat: c, depth });
      if (depth < 5) walk(c._id, depth + 1);
    }
  };
  walk("root", 0);
  return out;
}

export function CategorySelect({
  value,
  onChange,
  allowEmpty,
  emptyLabel = "— Choisir —",
  excludeId,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  excludeId?: string;
  className?: string;
}) {
  const cats = useQuery(api.categories.adminList);
  const flat = cats ? flattenCategories(cats) : [];
  return (
    <select className={className ?? inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {(allowEmpty || !value) && <option value="">{emptyLabel}</option>}
      {flat
        .filter((f) => f.cat._id !== excludeId)
        .map(({ cat, depth }) => (
          <option key={cat._id} value={cat._id}>
            {"  ".repeat(depth * 2)}
            {depth > 0 ? "└ " : ""}
            {cat.nameFr}
            {!cat.isActive ? " (désactivée)" : ""}
          </option>
        ))}
    </select>
  );
}
