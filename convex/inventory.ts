import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requirePermission } from "./lib/permissions";
import { logStock } from "./lib/stock";
import { roundMoney } from "./lib/utils";

/** Stock overview and per-product levels for Admin → Inventaire. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "catalog");
    const products = (await ctx.db.query("products").collect()).filter((p) => p.status !== "archived");
    let units = 0;
    let costValue = 0;
    let retailValue = 0;
    let missingCost = 0;
    for (const p of products) {
      const stock = Math.max(0, p.stock);
      units += stock;
      retailValue += stock * p.price;
      if (p.purchasePrice !== undefined) costValue += stock * p.purchasePrice;
      else if (stock > 0) missingCost++;
    }
    const rows = products
      .map((p) => ({
        _id: p._id,
        nameFr: p.nameFr,
        sku: p.sku,
        image: p.images[0] ?? null,
        stock: p.stock,
        minStockAlert: p.minStockAlert,
        price: p.price,
        purchasePrice: p.purchasePrice ?? null,
        status: p.status,
        salesCount: p.salesCount,
        linked: Boolean(p.sourceId),
        state: p.stock <= 0 ? ("out" as const) : p.stock <= p.minStockAlert ? ("low" as const) : ("ok" as const),
      }))
      .sort((a, b) => a.stock - b.stock || a.nameFr.localeCompare(b.nameFr));
    return {
      totals: {
        products: products.length,
        units,
        costValue: roundMoney(costValue),
        retailValue: roundMoney(retailValue),
        missingCost,
        low: rows.filter((r) => r.state === "low").length,
        out: rows.filter((r) => r.state === "out").length,
      },
      rows,
    };
  },
});

/** Latest stock movements, for one product or the whole store. */
export const movements = query({
  args: { productId: v.optional(v.id("products")), limit: v.optional(v.number()) },
  handler: async (ctx, { productId, limit }) => {
    await requirePermission(ctx, "catalog");
    const take = Math.min(Math.max(limit ?? 50, 1), 200);
    const rows = productId
      ? await ctx.db.query("stockMovements").withIndex("by_product", (q) => q.eq("productId", productId)).order("desc").take(take)
      : await ctx.db.query("stockMovements").order("desc").take(take);
    const products = new Map<string, Doc<"products"> | null>();
    const users = new Map<string, Doc<"users"> | null>();
    return Promise.all(
      rows.map(async (m) => {
        if (!products.has(m.productId)) products.set(m.productId, await ctx.db.get(m.productId));
        if (m.userId && !users.has(m.userId)) users.set(m.userId, await ctx.db.get(m.userId));
        const user = m.userId ? users.get(m.userId) : null;
        return {
          ...m,
          productName: products.get(m.productId)?.nameFr ?? "Produit supprimé",
          userName: user?.name || user?.email || null,
        };
      }),
    );
  },
});

/** Manual stock change with a reason (restock, loss/damage, correction). */
export const adjust = mutation({
  args: {
    productId: v.id("products"),
    mode: v.union(v.literal("add"), v.literal("remove"), v.literal("set")),
    quantity: v.number(),
    reason: v.union(v.literal("restock"), v.literal("loss"), v.literal("adjust")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { productId, mode, quantity, reason, note }) => {
    const user = await requirePermission(ctx, "catalog");
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100000) {
      throw new ConvexError({ code: "INVALID", message: "Quantité invalide." });
    }
    const p = await ctx.db.get(productId);
    if (!p) throw new ConvexError({ code: "NOT_FOUND", message: "Produit introuvable." });
    const stockAfter = mode === "set" ? quantity : mode === "add" ? p.stock + quantity : p.stock - quantity;
    if (stockAfter < 0) throw new ConvexError({ code: "INVALID", message: `Stock insuffisant (actuel : ${p.stock}).` });
    await ctx.db.patch(productId, { stock: stockAfter, updatedAt: Date.now() });
    await logStock(ctx, {
      productId,
      delta: stockAfter - p.stock,
      stockAfter,
      reason,
      note: note?.trim().slice(0, 200) || undefined,
      userId: user._id,
    });
    return stockAfter;
  },
});
