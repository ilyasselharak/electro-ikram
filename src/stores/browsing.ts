"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type BrowsingState = {
  recentlyViewed: string[];
  searchHistory: string[];
  addViewed: (id: string) => void;
  addSearch: (q: string) => void;
  clearSearches: () => void;
};

/** Per-visitor browsing memory kept in localStorage. */
export const useBrowsing = create<BrowsingState>()(
  persist(
    (set) => ({
      recentlyViewed: [],
      searchHistory: [],
      addViewed: (id) =>
        set((s) => ({ recentlyViewed: [id, ...s.recentlyViewed.filter((x) => x !== id)].slice(0, 12) })),
      addSearch: (q) => {
        const term = q.trim();
        if (term.length < 2) return;
        set((s) => ({
          searchHistory: [term, ...s.searchHistory.filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, 8),
        }));
      },
      clearSearches: () => set({ searchHistory: [] }),
    }),
    { name: "electro-ikram-browsing", storage: createJSONStorage(() => localStorage) },
  ),
);
