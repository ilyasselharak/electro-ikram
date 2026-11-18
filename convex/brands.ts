import { v, ConvexError } from "convex/values";
import { query, mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requirePermission } from "./lib/permissions";
import { vImage } from "./lib/validators";
import { clean, requireText, slugify } from "./lib/utils";
import { cleanupReplacedImages } from "./lib/images";
import { buildProductSearchText } from "./lib/catalog";

export const listPublic = query({
  args: { featuredOnly: v.optional(v.boolean()) },
  handler: async (ctx, { featuredOnly }) => {
    const all = await ctx.db.query("brands").withIndex("by_order").collect();
    return all
      .filter((b) => b.isActive && (!featuredOnly || b.isFeatured))
      .map((b) => ({
        _id: b._id,
        name: b.name,
        slug: b.slug,
        logo: b.logo ?? null,
        descriptionFr: b.descriptionFr,
        descriptionAr: b.descriptionAr,
      }));
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const b = await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!b || !b.isActive) return null;
    return {
      _id: b._id,
      name: b.name,
      slug: b.slug,
      logo: b.logo ?? null,
      descriptionFr: b.descriptionFr,
      descriptionAr: b.descriptionAr,
      updatedAt: b.updatedAt,
    };
  },
});

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "catalog");
    const all = await ctx.db.query("brands").withIndex("by_order").collect();
    const products = await ctx.db.query("products").collect();
    const counts = new Map<string, number>();
    for (const p of products) if (p.brandId) counts.set(p.brandId, (counts.get(p.brandId) ?? 0) + 1);
    return all.map((b) => ({ ...b, productCount: counts.get(b._id) ?? 0 }));
  },
});

const brandInput = {
  name: v.string(),
  slug: v.optional(v.string()),
  logo: v.optional(vImage),
  descriptionFr: v.optional(v.string()),
  descriptionAr: v.optional(v.string()),
  website: v.optional(v.string()),
  isActive: v.boolean(),
  isFeatured: v.boolean(),
};

async function uniqueSlug(ctx: MutationCtx, raw: string, excludeId?: Id<"brands">) {
  const root = slugify(raw);
  let candidate = root;
  for (let i = 2; ; i++) {
    const existing = await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (!existing || existing._id === excludeId) return candidate;
    candidate = `${root}-${i}`;
  }
}

export const create = mutation({
  args: brandInput,
  handler: async (ctx, args) => {
    await requirePermission(ctx, "catalog");
    const name = requireText(args.name, "Nom", 80);
    const last = await ctx.db.query("brands").withIndex("by_order").order("desc").first();
    return ctx.db.insert("brands", {
      ...args,
      name,
      slug: await uniqueSlug(ctx, clean(args.slug) ?? name),
      descriptionFr: clean(args.descriptionFr),
      descriptionAr: clean(args.descriptionAr),
      website: clean(args.website),
      order: last ? last.order + 1 : 0,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: { id: v.id("brands"), ...brandInput },
  handler: async (ctx, { id, ...args }) => {
    await requirePermission(ctx, "catalog");
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Marque introuvable." });
    const name = requireText(args.name, "Nom", 80);
    await ctx.db.patch(id, {
      ...args,
      name,
      slug: await uniqueSlug(ctx, clean(args.slug) ?? name, id),
      descriptionFr: clean(args.descriptionFr),
      descriptionAr: clean(args.descriptionAr),
      website: clean(args.website),
      updatedAt: Date.now(),
    });
    await cleanupReplacedImages(ctx, [existing.logo], [args.logo]);
    if (existing.name !== name) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_brand_status", (q) => q.eq("brandId", id))
        .collect();
      for (const p of products) {
        const cat = await ctx.db.get(p.categoryId);
        await ctx.db.patch(p._id, {
          searchText: buildProductSearchText(p, name, [cat?.nameFr ?? "", cat?.nameAr ?? ""]),
        });
      }
    }
  },
});

export const reorder = mutation({
  args: { ids: v.array(v.id("brands")) },
  handler: async (ctx, { ids }) => {
    await requirePermission(ctx, "catalog");
    for (let i = 0; i < ids.length; i++) await ctx.db.patch(ids[i], { order: i });
  },
});

export const remove = mutation({
  args: { id: v.id("brands") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "catalog");
    const used = await ctx.db
      .query("products")
      .withIndex("by_brand_status", (q) => q.eq("brandId", id))
      .first();
    if (used) {
      throw new ConvexError({
        code: "IN_USE",
        message: "Des produits utilisent cette marque. Modifiez-les avant de la supprimer.",
      });
    }
    const existing = await ctx.db.get(id);
    await ctx.db.delete(id);
    if (existing) await cleanupReplacedImages(ctx, [existing.logo], []);
  },
});
