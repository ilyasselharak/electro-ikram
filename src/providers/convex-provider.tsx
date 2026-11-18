"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { useState, type ReactNode } from "react";

/**
 * Storefront Convex client with customer sign-in.
 * The session lives in the browser (localStorage), not in cookies, so every
 * storefront page stays static/ISR. Its own storage namespace keeps it apart
 * from the admin session (cookie-based, see admin-convex-provider.tsx).
 */
export function PublicConvexProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!));
  return (
    <ConvexAuthProvider client={client} storageNamespace="electro-ikram-store" shouldHandleCode={false}>
      {children}
    </ConvexAuthProvider>
  );
}
