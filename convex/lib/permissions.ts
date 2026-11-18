import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import type { Role } from "./validators";

export type Permission =
  | "catalog" // products, categories, brands
  | "content" // homepage, banners, SEO
  | "orders"
  | "customers"
  | "coupons"
  | "settings"
  | "stats"
  | "users";

const ALL: Permission[] = [
  "catalog",
  "content",
  "orders",
  "customers",
  "coupons",
  "settings",
  "stats",
  "users",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL,
  admin: ALL.filter((p) => p !== "users"),
  editor: ["catalog", "content"],
};

export function roleCan(role: Role | undefined, permission: Permission) {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Returns the signed-in staff user, or null if not signed in / not staff. */
export async function getStaffUser(
  ctx: QueryCtx | MutationCtx,
): Promise<(Doc<"users"> & { role: Role }) | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const user = await ctx.db.get(userId);
  if (!user || !user.role || user.isActive === false) return null;
  return user as Doc<"users"> & { role: Role };
}

/**
 * Server-side authorization guard. Every admin query and mutation calls this:
 * frontend role checks are only cosmetic.
 */
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  permission: Permission,
) {
  const user = await getStaffUser(ctx);
  if (!user) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentification requise." });
  }
  if (!roleCan(user.role, permission)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Accès refusé." });
  }
  return user;
}
