"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";

export type PublicSettings = FunctionReturnType<typeof api.settings.getPublic>;

const Ctx = createContext<PublicSettings | null>(null);

export function StoreSettingsProvider({ value, children }: { value: PublicSettings; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStoreSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStoreSettings must be used inside StoreSettingsProvider");
  return v;
}
