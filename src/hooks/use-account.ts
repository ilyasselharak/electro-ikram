"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

/** The signed-in customer (null when signed out, undefined while loading). */
export function useAccount() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.account.me, isAuthenticated ? {} : "skip");
  if (isLoading || (isAuthenticated && me === undefined)) return undefined;
  return isAuthenticated ? me : null;
}
