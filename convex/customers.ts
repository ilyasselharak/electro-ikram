import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation } from "./_generated/server";
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
    return {
      customer,
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
