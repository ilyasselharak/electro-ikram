import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { toCards } from "./lib/catalog";
import { requireAccount } from "./account";

const MAX_ITEMS = 200;

/** Product ids in the caller's wishlist (empty when signed out). */
export const ids = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db.query("wishlists").withIndex("by_user", (q) => q.eq("userId", userId)).take(MAX_ITEMS);
    return rows.map((r) => r.productId);
  },
});

/** Wishlist as product cards, most recently added first. Unpublished products are hidden. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("wishlists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(MAX_ITEMS);
    const products = (await Promise.all(rows.map((r) => ctx.db.get(r.productId)))).filter(
      (p): p is Doc<"products"> => p !== null && p.status === "published",
    );
    return toCards(ctx, products);
  },
});

/** Adds or removes a product; returns whether it is now in the wishlist. */
export const toggle = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const user = await requireAccount(ctx);
    const existing = await ctx.db
      .query("wishlists")
      .withIndex("by_user_product", (q) => q.eq("userId", user._id).eq("productId", productId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    const product = await ctx.db.get(productId);
    if (!product || product.status !== "published") {
      throw new ConvexError({ code: "UNAVAILABLE", message: "Produit indisponible." });
    }
    const count = (await ctx.db.query("wishlists").withIndex("by_user", (q) => q.eq("userId", user._id)).take(MAX_ITEMS)).length;
    if (count >= MAX_ITEMS) throw new ConvexError({ code: "LIMIT", message: "Liste d'envies pleine." });
    await ctx.db.insert("wishlists", { userId: user._id, productId });
    return true;
  },
});
