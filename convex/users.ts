import { v, ConvexError } from "convex/values";
import {
  createAccount,
  getAuthUserId,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ROLE_PERMISSIONS, getStaffUser, requirePermission } from "./lib/permissions";
import { vRole, type Role } from "./lib/validators";
import { isValidEmail } from "./lib/utils";

function checkPassword(password: string) {
  if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    throw new ConvexError({
      code: "WEAK_PASSWORD",
      message: "Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre.",
    });
  }
}

/** The signed-in staff member with their permissions, or null. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const isStaff = !!user.role && user.isActive !== false;
    return {
      _id: user._id,
      name: user.name ?? null,
      email: user.email ?? null,
      role: (user.role ?? null) as Role | null,
      isStaff,
      permissions: isStaff ? ROLE_PERMISSIONS[user.role as Role] : [],
    };
  },
});

export const recordLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getStaffUser(ctx);
    if (user) await ctx.db.patch(user._id, { lastLoginAt: Date.now() });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "users");
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.role)
      .map((u) => ({
        _id: u._id,
        name: u.name ?? "",
        email: u.email ?? "",
        role: u.role!,
        isActive: u.isActive !== false,
        lastLoginAt: u.lastLoginAt ?? null,
        createdAt: u._creationTime,
      }));
  },
});

/* ----------------------------- Internal helpers ----------------------------- */

export const _caller = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await getStaffUser(ctx);
    return user ? { _id: user._id, role: user.role, email: user.email ?? "" } : null;
  },
});

export const _getUser = internalQuery({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const _ownerCount = internalQuery({
  args: {},
  handler: async (ctx) =>
    (await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "owner")).collect()).filter(
      (u) => u.isActive !== false,
    ).length,
});

export const _emailTaken = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) =>
    !!(await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first()),
});

async function requireOwner(ctx: ActionCtx) {
  const caller = await ctx.runQuery(internal.users._caller, {});
  if (!caller) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentification requise." });
  if (caller.role !== "owner") throw new ConvexError({ code: "FORBIDDEN", message: "Réservé au propriétaire." });
  return caller;
}

async function createStaff(
  ctx: ActionCtx,
  args: { email: string; password: string; name: string; role: Role },
) {
  const email = args.email.trim().toLowerCase();
  if (!isValidEmail(email)) throw new ConvexError({ code: "INVALID", message: "E-mail invalide." });
  checkPassword(args.password);
  if (await ctx.runQuery(internal.users._emailTaken, { email })) {
    throw new ConvexError({ code: "INVALID", message: "Un compte existe déjà avec cet e-mail." });
  }
  const { user } = await createAccount(ctx, {
    provider: "password",
    account: { id: email, secret: args.password },
    profile: { email, name: args.name.trim(), role: args.role, isActive: true },
  });
  return user._id as Id<"users">;
}

/* ---------------------------------- Owner ---------------------------------- */

/**
 * Bootstrap: create the very first owner account from the CLI.
 *   npx convex run users:createFirstOwner '{"email":"...","password":"...","name":"..."}'
 * Refuses to run once an owner exists.
 */
export const createFirstOwner = internalAction({
  args: { email: v.string(), password: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const owners = await ctx.runQuery(internal.users._ownerCount, {});
    if (owners > 0) throw new ConvexError("Un propriétaire existe déjà. Utilisez /admin/users.");
    const id = await createStaff(ctx, {
      email: args.email,
      password: args.password,
      name: args.name ?? "Propriétaire",
      role: "owner",
    });
    return { userId: id, email: args.email.trim().toLowerCase() };
  },
});

export const create = action({
  args: { email: v.string(), password: v.string(), name: v.string(), role: vRole },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    return createStaff(ctx, args);
  },
});

export const _patchStaff = internalMutation({
  args: {
    id: v.id("users"),
    role: v.optional(vRole),
    isActive: v.optional(v.boolean()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, val]) => val !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const update = action({
  args: { id: v.id("users"), role: vRole, isActive: v.boolean(), name: v.string() },
  handler: async (ctx, args) => {
    const caller = await requireOwner(ctx);
    const target = await ctx.runQuery(internal.users._getUser, { id: args.id });
    if (!target?.role) throw new ConvexError({ code: "NOT_FOUND", message: "Utilisateur introuvable." });
    if (args.id === caller._id && (args.role !== "owner" || !args.isActive)) {
      throw new ConvexError({ code: "INVALID", message: "Vous ne pouvez pas retirer vos propres droits." });
    }
    if (target.role === "owner" && (args.role !== "owner" || !args.isActive)) {
      const owners = await ctx.runQuery(internal.users._ownerCount, {});
      if (owners <= 1) throw new ConvexError({ code: "INVALID", message: "Il doit rester au moins un propriétaire actif." });
    }
    await ctx.runMutation(internal.users._patchStaff, {
      id: args.id,
      role: args.role,
      isActive: args.isActive,
      name: args.name.trim(),
    });
    if (!args.isActive) await invalidateSessions(ctx, { userId: args.id });
  },
});

export const resetPasswordFor = action({
  args: { id: v.id("users"), password: v.string() },
  handler: async (ctx, { id, password }) => {
    await requireOwner(ctx);
    checkPassword(password);
    const target = await ctx.runQuery(internal.users._getUser, { id });
    if (!target?.email) throw new ConvexError({ code: "NOT_FOUND", message: "Utilisateur introuvable." });
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: target.email, secret: password },
    });
    await invalidateSessions(ctx, { userId: id });
  },
});

export const changeOwnPassword = action({
  args: { currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const caller = await ctx.runQuery(internal.users._caller, {});
    if (!caller) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentification requise." });
    checkPassword(newPassword);
    try {
      await retrieveAccount(ctx, { provider: "password", account: { id: caller.email, secret: currentPassword } });
    } catch {
      throw new ConvexError({ code: "INVALID_CREDENTIALS", message: "Mot de passe actuel incorrect." });
    }
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: caller.email, secret: newPassword },
    });
  },
});

export const remove = action({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const caller = await requireOwner(ctx);
    if (id === caller._id) throw new ConvexError({ code: "INVALID", message: "Vous ne pouvez pas supprimer votre propre compte." });
    const target = await ctx.runQuery(internal.users._getUser, { id });
    if (target?.role === "owner") {
      const owners = await ctx.runQuery(internal.users._ownerCount, {});
      if (owners <= 1) throw new ConvexError({ code: "INVALID", message: "Il doit rester au moins un propriétaire actif." });
    }
    await invalidateSessions(ctx, { userId: id });
    await ctx.runMutation(internal.users._deleteUser, { id });
  },
});

export const _deleteUser = internalMutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", id))
      .collect();
    for (const a of accounts) await ctx.db.delete(a._id);
    await ctx.db.delete(id);
  },
});
