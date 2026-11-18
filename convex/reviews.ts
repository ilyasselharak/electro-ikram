import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requirePermission } from "./lib/permissions";
import { rateLimit } from "./lib/utils";
import { requireAccount } from "./account";

/**
 * Product reviews. Only customers whose order containing the product was
 * delivered can review it (one review per product, editable). Reviews are
 * published after moderation in Admin → Avis.
 */

const vStatus = v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"));

/** "Yassine El Amrani" → "Yassine E." */
function publicName(name: string | undefined) {
  const [first, ...rest] = (name ?? "").trim().split(/\s+/);
  if (!first) return "Client";
  return rest.length ? `${first} ${rest[0][0].toUpperCase()}.` : first;
}

async function hasReceived(ctx: QueryCtx, userId: Id<"users">, productId: Id<"products">) {
  const orders = await ctx.db.query("orders").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  return orders.some((o) => o.status === "delivered" && o.items.some((i) => i.productId === productId));
}

/** Keeps products.ratingAvg / ratingCount equal to the approved reviews. */
async function refreshRating(ctx: MutationCtx, productId: Id<"products">) {
  const approved = await ctx.db
    .query("reviews")
    .withIndex("by_product_status", (q) => q.eq("productId", productId).eq("status", "approved"))
    .collect();
  const count = approved.length;
  const avg = count ? Math.round((approved.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  if (await ctx.db.get(productId)) await ctx.db.patch(productId, { ratingAvg: avg, ratingCount: count });
}

/* --------------------------------- Public --------------------------------- */

export const forProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const approved = await ctx.db
      .query("reviews")
      .withIndex("by_product_status", (q) => q.eq("productId", productId).eq("status", "approved"))
      .order("desc")
      .collect();
    const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: approved.filter((r) => r.rating === stars).length }));
    const count = approved.length;
    return {
      count,
      average: count ? Math.round((approved.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0,
      distribution,
      items: approved.slice(0, 50).map((r) => ({
        _id: r._id,
        author: r.authorName,
        rating: r.rating,
        title: r.title ?? null,
        body: r.body,
        adminReply: r.adminReply ?? null,
        createdAt: r._creationTime,
      })),
    };
  },
});

/** What the signed-in visitor can do on a product page. */
export const myStatus = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { state: "signedOut" as const };
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_user_product", (q) => q.eq("userId", userId).eq("productId", productId))
      .first();
    if (existing) {
      return {
        state: "reviewed" as const,
        review: { rating: existing.rating, title: existing.title ?? "", body: existing.body, status: existing.status },
      };
    }
    return { state: (await hasReceived(ctx, userId, productId)) ? ("canReview" as const) : ("notPurchased" as const) };
  },
});

export const submit = mutation({
  args: { productId: v.id("products"), rating: v.number(), title: v.optional(v.string()), body: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAccount(ctx);
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new ConvexError({ code: "INVALID", message: "Note invalide." });
    }
    const body = args.body.trim();
    if (body.length < 10 || body.length > 2000) {
      throw new ConvexError({ code: "INVALID", message: "Votre avis doit contenir entre 10 et 2000 caractères." });
    }
    const title = args.title?.trim().slice(0, 120) || undefined;
    if (!(await hasReceived(ctx, user._id, args.productId))) {
      throw new ConvexError({ code: "NOT_PURCHASED", message: "Seuls les clients ayant reçu ce produit peuvent l'évaluer." });
    }
    await rateLimit(ctx, `review:${user._id}`, 10, 60 * 60 * 1000);

    const product = await ctx.db.get(args.productId);
    if (!product) throw new ConvexError({ code: "NOT_FOUND", message: "Produit introuvable." });
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_user_product", (q) => q.eq("userId", user._id).eq("productId", args.productId))
      .first();
    const data = {
      rating: args.rating,
      title,
      body,
      authorName: publicName(user.name),
      // Edits go back to moderation.
      status: "pending" as const,
      updatedAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, data);
    else await ctx.db.insert("reviews", { ...data, productId: args.productId, userId: user._id });
    await refreshRating(ctx, args.productId);
    await ctx.db.insert("adminNotifications", {
      kind: "review",
      title: `Nouvel avis (${args.rating}★) : ${product.nameFr}`,
      body: body.slice(0, 120),
      link: "/admin/reviews",
      isRead: false,
    });
  },
});

/* ---------------------------------- Admin --------------------------------- */

export const adminList = query({
  args: { status: vStatus, paginationOpts: paginationOptsValidator },
  handler: async (ctx, { status, paginationOpts }) => {
    await requirePermission(ctx, "catalog");
    const page = await ctx.db
      .query("reviews")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (r) => {
          const [product, user] = await Promise.all([ctx.db.get(r.productId), ctx.db.get(r.userId)]);
          return {
            ...r,
            productName: product?.nameFr ?? "Produit supprimé",
            productSlug: product?.slug ?? null,
            productId: r.productId,
            userEmail: user?.email ?? "",
            userName: user?.name ?? "",
          };
        }),
      ),
    };
  },
});

export const counts = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "catalog");
    const pending = await ctx.db.query("reviews").withIndex("by_status", (q) => q.eq("status", "pending")).collect();
    return { pending: pending.length };
  },
});

export const moderate = mutation({
  args: { id: v.id("reviews"), status: vStatus },
  handler: async (ctx, { id, status }) => {
    await requirePermission(ctx, "catalog");
    const r = await ctx.db.get(id);
    if (!r) throw new ConvexError({ code: "NOT_FOUND", message: "Avis introuvable." });
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
    await refreshRating(ctx, r.productId);
  },
});

export const reply = mutation({
  args: { id: v.id("reviews"), reply: v.string() },
  handler: async (ctx, { id, reply }) => {
    await requirePermission(ctx, "catalog");
    const r = await ctx.db.get(id);
    if (!r) throw new ConvexError({ code: "NOT_FOUND", message: "Avis introuvable." });
    await ctx.db.patch(id, { adminReply: reply.trim().slice(0, 1000) || undefined, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "catalog");
    const r = await ctx.db.get(id);
    if (!r) return;
    await ctx.db.delete(id);
    await refreshRating(ctx, r.productId);
  },
});
