"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True once rendering on the client — avoids hydration mismatches for persisted stores. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
