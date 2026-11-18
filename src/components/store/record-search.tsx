"use client";

import { useEffect } from "react";
import { useBrowsing } from "@/stores/browsing";

/** Stores the current search term in the visitor's local search history. */
export function RecordSearch({ q }: { q: string }) {
  const addSearch = useBrowsing((s) => s.addSearch);
  useEffect(() => {
    addSearch(q);
  }, [q, addSearch]);
  return null;
}
