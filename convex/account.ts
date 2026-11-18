import { v, ConvexError } from "convex/values";
import { getAuthUserId, modifyAccountCredentials, retrieveAccount } from "@convex-dev/auth/server";
import { action, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { toPublicOrder } from "./orders";
import { isValidPhone, normalizePhone, requireText } from "./lib/utils";
import type { SavedAddress } from "./lib/validators";

/**
 * Customer account (storefront /account). Every function acts on the caller's
 * own data only: the user id always comes from the session, never from args.
 */

const MAX_ADDRESSES = 5;

export async function requireAccount(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Connectez-vous pour continuer." });
  const user = await ctx.db.get(userId);
  if (!user || user.isActive === false) {
    throw new ConvexError({ code: "DISABLED", message: "Ce compte est désactivé." });
  }
  return user;
}

/** "active" | "disabled" | "signedOut": lets the storefront sign disabled accounts out. */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return "signedOut" as const;
    const user = await ctx.db.get(userId);
    return !user || user.isActive === false ? ("disabled" as const) : ("active" as const);
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user || user.isActive === false) return null;
    return {
      _id: user._id,
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      isStaff: !!user.role,
      addresses: user.addresses ?? [],
      createdAt: user._creationTime,
    };
  },
});

export const updateProfile = mutation({
  args: { name: v.string(), phone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAccount(ctx);
    const name = requireText(args.name, "Nom", 120);
    let phone: string | undefined;
    if (args.phone?.trim()) {
      phone = normalizePhone(args.phone);
      if (!isValidPhone(phone)) throw new ConvexError({ code: "INVALID_PHONE", message: "Numéro de téléphone invalide." });
    }
    await ctx.db.patch(user._id, { name, phone });
  },
});

export const saveAddress = mutation({
  args: {
    id: v.optional(v.string()),
    label: v.optional(v.string()),
    fullName: v.string(),
    phone: v.string(),
    city: v.string(),
    address: v.string(),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAccount(ctx);
    const phone = normalizePhone(args.phone);
    if (!isValidPhone(phone)) throw new ConvexError({ code: "INVALID_PHONE", message: "Numéro de téléphone invalide." });
    const list = [...(user.addresses ?? [])];
    const existing = args.id ? list.findIndex((a) => a.id === args.id) : -1;
    if (existing === -1 && list.length >= MAX_ADDRESSES) {
      throw new ConvexError({ code: "LIMIT", message: `${MAX_ADDRESSES} adresses maximum.` });
    }
    const entry: SavedAddress = {
      id: existing >= 0 ? list[existing].id : crypto.randomUUID().slice(0, 8),
      label: args.label?.trim().slice(0, 40) || undefined,
      fullName: requireText(args.fullName, "Nom", 120),
      phone,
      city: requireText(args.city, "Ville", 80),
      address: requireText(args.address, "Adresse", 400),
      isDefault: args.isDefault ?? list.length === 0,
    };
    if (existing >= 0) list[existing] = entry;
    else list.push(entry);
    // Exactly one default address.
    const defaultId = entry.isDefault ? entry.id : (list.find((a) => a.isDefault)?.id ?? list[0].id);
    await ctx.db.patch(user._id, { addresses: list.map((a) => ({ ...a, isDefault: a.id === defaultId })) });
    return entry.id;
  },
});

export const removeAddress = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const user = await requireAccount(ctx);
    const list = (user.addresses ?? []).filter((a) => a.id !== id);
    if (list.length && !list.some((a) => a.isDefault)) list[0] = { ...list[0], isDefault: true };
    await ctx.db.patch(user._id, { addresses: list });
  },
});

/** Orders placed while signed in, newest first. */
export const myOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
    return Promise.all(
      orders.map(async (o) => {
        const history = await ctx.db
          .query("orderStatusHistory")
          .withIndex("by_order", (q) => q.eq("orderId", o._id))
          .collect();
        return toPublicOrder(o, history);
      }),
    );
  },
});

export const _caller = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireAccount(ctx);
    return { email: user.email ?? "" };
  },
});

export const changePassword = action({
  args: { currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const { email } = await ctx.runQuery(internal.account._caller, {});
    if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      throw new ConvexError({
        code: "WEAK_PASSWORD",
        message: "Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre.",
      });
    }
    try {
      await retrieveAccount(ctx, { provider: "password", account: { id: email, secret: currentPassword } });
    } catch {
      throw new ConvexError({ code: "INVALID_CREDENTIALS", message: "Mot de passe actuel incorrect." });
    }
    await modifyAccountCredentials(ctx, { provider: "password", account: { id: email, secret: newPassword } });
  },
});
