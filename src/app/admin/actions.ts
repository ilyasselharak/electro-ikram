"use server";

import { revalidateTag } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@convex/_generated/api";
import { STOREFRONT_TAG } from "@/lib/convex-server";

/** Purges cached storefront data after an admin edit. Verifies the caller is staff. */
export async function revalidateStorefront() {
  const token = await convexAuthNextjsToken();
  if (!token) return { ok: false };
  const me = await fetchQuery(api.users.me, {}, { token });
  if (!me?.isStaff) return { ok: false };
  revalidateTag(STOREFRONT_TAG, { expire: 0 });
  return { ok: true };
}
