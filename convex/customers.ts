import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { invalidateSessions } from "@convex-dev/auth/server";
import { action, internalMutation, internalQuery, query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requirePermission } from "./lib/permissions";

export const adminList = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    blockedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { paginationOpts, search, blockedOnly }) => {
    await requirePermission(ctx, "customers");
    const term = search?.trim();
    let q = term
      ? ctx.db.query("customers").withSearchIndex("search_text", (s) => s.search("searchText", term))
      : ctx.db.query("customers").withIndex("by_last_order").order("desc");
    if (blockedOnly) q = q.filter((f) => f.eq(f.field("isBlocked"), true));
    return q.paginate(paginationOpts);
  },
});

export const adminGet = query({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "customers");
    const customer = await ctx.db.get(id);
    if (!customer) return null;
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", id))
      .order("desc")
      .take(100);
    const user = customer.userId ? await ctx.db.get(customer.userId) : null;
    const account = user
      ? {
          _id: user._id,
          email: user.email ?? "",
          name: user.name ?? "",
          isActive: user.isActive !== false,
          createdAt: user._creationTime,
          wishlistCount: (await ctx.db.query("wishlists").withIndex("by_user", (q) => q.eq("userId", user._id)).collect()).length,
          reviewCount: (await ctx.db.query("reviews").withIndex("by_user", (q) => q.eq("userId", user._id)).collect()).length,
        }
      : null;
    return {
      customer,
      account,
      orders: orders.map((o) => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        createdAt: o._creationTime,
      })),
    };
  },
});

export const updateNotes = mutation({
  args: { id: v.id("customers"), notes: v.string() },
  handler: async (ctx, { id, notes }) => {
    await requirePermission(ctx, "customers");
    await ctx.db.patch(id, { notes: notes.slice(0, 5000) });
  },
});

export const setBlocked = mutation({
  args: { id: v.id("customers"), isBlocked: v.boolean() },
  handler: async (ctx, { id, isBlocked }) => {
    await requirePermission(ctx, "customers");
    const c = await ctx.db.get(id);
    if (!c) throw new ConvexError({ code: "NOT_FOUND", message: "Client introuvable." });
    await ctx.db.patch(id, { isBlocked });
  },
});

/* ----------------------------- Customer accounts ---------------------------- */

/** Registered customer accounts (users without a staff role), newest first. */
export const accounts = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, { search }) => {
    await requirePermission(ctx, "customers");
    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", undefined))
      .order("desc")
      .take(500);
    const term = search?.trim().toLowerCase();
    const filtered = term
      ? users.filter((u) => `${u.name ?? ""} ${u.email ?? ""} ${u.phone ?? ""}`.toLowerCase().includes(term))
      : users;
    return Promise.all(
      filtered.slice(0, 200).map(async (u) => {
        const [orders, wishlist, customer] = await Promise.all([
          ctx.db.query("orders").withIndex("by_user", (q) => q.eq("userId", u._id)).collect(),
          ctx.db.query("wishlists").withIndex("by_user", (q) => q.eq("userId", u._id)).collect(),
          ctx.db.query("customers").withIndex("by_user", (q) => q.eq("userId", u._id)).first(),
        ]);
        return {
          _id: u._id,
          name: u.name ?? "",
          email: u.email ?? "",
          phone: u.phone ?? "",
          isActive: u.isActive !== false,
          createdAt: u._creationTime,
          orderCount: orders.length,
          totalSpent: orders.filter((o) => o.status !== "cancelled" && o.status !== "returned").reduce((s, o) => s + o.total, 0),
          wishlistCount: wishlist.length,
          customerId: customer?._id ?? null,
        };
      }),
    );
  },
});

export const _checkCustomersPermission = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "customers");
  },
});

export const _setAccountActive = internalMutation({
  args: { userId: v.id("users"), isActive: v.boolean() },
  handler: async (ctx, { userId, isActive }) => {
    const user = await ctx.db.get(userId);
    // Staff accounts are managed from Admin → Administrateurs only.
    if (!user || user.role) throw new ConvexError({ code: "NOT_FOUND", message: "Compte client introuvable." });
    await ctx.db.patch(userId, { isActive });
  },
});

/** Disabling signs the customer out everywhere and blocks sign-in and checkout. */
export const setAccountActive = action({
  args: { userId: v.id("users"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.customers._checkCustomersPermission, {});
    await ctx.runMutation(internal.customers._setAccountActive, args);
    if (!args.isActive) await invalidateSessions(ctx, { userId: args.userId });
  },
});
