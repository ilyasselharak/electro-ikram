import { v, ConvexError } from "convex/values";
import { query, mutation, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requirePermission } from "./lib/permissions";
import { vBannerPlacement, vImage, vSectionItem, vSectionType } from "./lib/validators";
import { toCards } from "./lib/catalog";
import { cleanupReplacedImages } from "./lib/images";
import { clean } from "./lib/utils";

async function activeBanners(ctx: QueryCtx, placement: "hero" | "promo") {
  const now = Date.now();
  const list = await ctx.db
    .query("banners")
    .withIndex("by_placement", (q) => q.eq("placement", placement))
    .collect();
  return list
    .filter((b) => b.isActive && (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt >= now))
    .map((b) => ({
      _id: b._id,
      titleFr: b.titleFr,
      titleAr: b.titleAr,
      subtitleFr: b.subtitleFr,
      subtitleAr: b.subtitleAr,
      ctaFr: b.ctaFr,
      ctaAr: b.ctaAr,
      link: b.link,
      image: b.image ?? null,
      mobileImage: b.mobileImage ?? null,
      theme: b.theme ?? "dark",
    }));
}

async function productsByIds(ctx: QueryCtx, ids: Doc<"homepageSections">["productIds"]) {
  const docs = await Promise.all((ids ?? []).map((id) => ctx.db.get(id)));
  return docs.filter((p): p is Doc<"products"> => !!p && p.status === "published");
}

/** Resolves every enabled homepage section with its data, in display order. */
export const getPublic = query({
  args: {},
  handler: async (ctx) => {
    const sections = (await ctx.db.query("homepageSections").withIndex("by_order").collect()).filter(
      (s) => s.isEnabled,
    );
    const published = () =>
      ctx.db.query("products").withIndex("by_status", (q) => q.eq("status", "published"));

    const resolved = [];
    for (const s of sections) {
      const limit = Math.min(s.limit ?? 8, 24);
      const base = {
        _id: s._id,
        titleFr: s.titleFr,
        titleAr: s.titleAr,
        subtitleFr: s.subtitleFr,
        subtitleAr: s.subtitleAr,
      };
      switch (s.type) {
        case "hero":
          resolved.push({ ...base, type: s.type, banners: await activeBanners(ctx, "hero") });
          break;
        case "promo_banners":
          resolved.push({ ...base, type: s.type, banners: await activeBanners(ctx, "promo") });
          break;
        case "categories": {
          let cats: Doc<"categories">[];
          if (s.categoryIds?.length) {
            cats = (await Promise.all(s.categoryIds.map((id) => ctx.db.get(id)))).filter(
              (c): c is Doc<"categories"> => !!c && c.isActive,
            );
          } else {
            cats = (await ctx.db.query("categories").withIndex("by_order").collect()).filter(
              (c) => c.isActive && !c.parentId,
            );
          }
          resolved.push({
            ...base,
            type: s.type,
            categories: cats.slice(0, Math.max(limit, 12)).map((c) => ({
              _id: c._id,
              slug: c.slug,
              nameFr: c.nameFr,
              nameAr: c.nameAr,
              image: c.image ?? null,
              icon: c.icon,
            })),
          });
          break;
        }
        case "best_sellers": {
          let list = await productsByIds(ctx, s.productIds);
          if (!list.length) {
            list = await ctx.db
              .query("products")
              .withIndex("by_status_bestseller", (q) => q.eq("status", "published").eq("isBestSeller", true))
              .take(limit);
          }
          if (!list.length) {
            list = await ctx.db
              .query("products")
              .withIndex("by_status_sales", (q) => q.eq("status", "published"))
              .order("desc")
              .take(limit);
          }
          resolved.push({ ...base, type: s.type, products: await toCards(ctx, list.slice(0, limit)) });
          break;
        }
        case "featured_products": {
          let list = await productsByIds(ctx, s.productIds);
          if (!list.length) {
            list = await ctx.db
              .query("products")
              .withIndex("by_status_featured", (q) => q.eq("status", "published").eq("isFeatured", true))
              .take(limit);
          }
          resolved.push({ ...base, type: s.type, products: await toCards(ctx, list.slice(0, limit)) });
          break;
        }
        case "new_arrivals": {
          const list = await published().order("desc").take(limit);
          resolved.push({ ...base, type: s.type, products: await toCards(ctx, list) });
          break;
        }
        case "offers": {
          let list = await productsByIds(ctx, s.productIds);
          if (!list.length) {
            const all = await published().collect();
            list = all
              .filter((p) => p.oldPrice && p.oldPrice > p.price)
              .sort((a, b) => (b.oldPrice! - b.price) / b.oldPrice! - (a.oldPrice! - a.price) / a.oldPrice!);
          }
          resolved.push({ ...base, type: s.type, products: await toCards(ctx, list.slice(0, limit)) });
          break;
        }
        case "brands": {
          let brands: Doc<"brands">[];
          if (s.brandIds?.length) {
            brands = (await Promise.all(s.brandIds.map((id) => ctx.db.get(id)))).filter(
              (b): b is Doc<"brands"> => !!b && b.isActive,
            );
          } else {
            brands = (await ctx.db.query("brands").withIndex("by_order").collect()).filter(
              (b) => b.isActive && b.isFeatured,
            );
          }
          resolved.push({
            ...base,
            type: s.type,
            brands: brands.map((b) => ({ _id: b._id, name: b.name, slug: b.slug, logo: b.logo ?? null })),
          });
          break;
        }
        case "why_us":
        case "testimonials":
          resolved.push({ ...base, type: s.type, items: s.items ?? [] });
          break;
        case "newsletter":
          resolved.push({ ...base, type: s.type });
          break;
      }
    }
    return resolved;
  },
});

/* --------------------------------- Admin --------------------------------- */

export const adminSections = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "content");
    return ctx.db.query("homepageSections").withIndex("by_order").collect();
  },
});

const sectionInput = {
  type: vSectionType,
  titleFr: v.optional(v.string()),
  titleAr: v.optional(v.string()),
  subtitleFr: v.optional(v.string()),
  subtitleAr: v.optional(v.string()),
  isEnabled: v.boolean(),
  limit: v.optional(v.number()),
  productIds: v.optional(v.array(v.id("products"))),
  categoryIds: v.optional(v.array(v.id("categories"))),
  brandIds: v.optional(v.array(v.id("brands"))),
  items: v.optional(v.array(vSectionItem)),
};

export const createSection = mutation({
  args: sectionInput,
  handler: async (ctx, args) => {
    await requirePermission(ctx, "content");
    const last = await ctx.db.query("homepageSections").withIndex("by_order").order("desc").first();
    return ctx.db.insert("homepageSections", { ...args, order: last ? last.order + 1 : 0 });
  },
});

export const updateSection = mutation({
  args: { id: v.id("homepageSections"), ...sectionInput },
  handler: async (ctx, { id, ...args }) => {
    await requirePermission(ctx, "content");
    if (args.limit !== undefined && (args.limit < 1 || args.limit > 24)) {
      throw new ConvexError({ code: "INVALID", message: "Le nombre d'éléments doit être entre 1 et 24." });
    }
    await ctx.db.patch(id, args);
  },
});

export const toggleSection = mutation({
  args: { id: v.id("homepageSections"), isEnabled: v.boolean() },
  handler: async (ctx, { id, isEnabled }) => {
    await requirePermission(ctx, "content");
    await ctx.db.patch(id, { isEnabled });
  },
});

export const reorderSections = mutation({
  args: { ids: v.array(v.id("homepageSections")) },
  handler: async (ctx, { ids }) => {
    await requirePermission(ctx, "content");
    for (let i = 0; i < ids.length; i++) await ctx.db.patch(ids[i], { order: i });
  },
});

export const removeSection = mutation({
  args: { id: v.id("homepageSections") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "content");
    await ctx.db.delete(id);
  },
});

/* -------------------------------- Banners -------------------------------- */

export const adminBanners = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "content");
    const hero = await ctx.db.query("banners").withIndex("by_placement", (q) => q.eq("placement", "hero")).collect();
    const promo = await ctx.db.query("banners").withIndex("by_placement", (q) => q.eq("placement", "promo")).collect();
    return [...hero, ...promo];
  },
});

const bannerInput = {
  placement: vBannerPlacement,
  titleFr: v.optional(v.string()),
  titleAr: v.optional(v.string()),
  subtitleFr: v.optional(v.string()),
  subtitleAr: v.optional(v.string()),
  ctaFr: v.optional(v.string()),
  ctaAr: v.optional(v.string()),
  link: v.optional(v.string()),
  image: v.optional(vImage),
  mobileImage: v.optional(vImage),
  theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
  isActive: v.boolean(),
  startsAt: v.optional(v.number()),
  endsAt: v.optional(v.number()),
};

function cleanBanner<T extends Record<string, unknown>>(args: T) {
  const out: Record<string, unknown> = { ...args };
  for (const k of ["titleFr", "titleAr", "subtitleFr", "subtitleAr", "ctaFr", "ctaAr", "link"]) {
    out[k] = clean(args[k] as string | undefined);
  }
  return out as T;
}

export const createBanner = mutation({
  args: bannerInput,
  handler: async (ctx, args) => {
    await requirePermission(ctx, "content");
    const last = await ctx.db
      .query("banners")
      .withIndex("by_placement", (q) => q.eq("placement", args.placement))
      .order("desc")
      .first();
    return ctx.db.insert("banners", { ...cleanBanner(args), order: last ? last.order + 1 : 0 });
  },
});

export const updateBanner = mutation({
  args: { id: v.id("banners"), ...bannerInput },
  handler: async (ctx, { id, ...args }) => {
    await requirePermission(ctx, "content");
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Bannière introuvable." });
    await ctx.db.patch(id, cleanBanner(args));
    await cleanupReplacedImages(ctx, [existing.image, existing.mobileImage], [args.image, args.mobileImage]);
  },
});

export const reorderBanners = mutation({
  args: { ids: v.array(v.id("banners")) },
  handler: async (ctx, { ids }) => {
    await requirePermission(ctx, "content");
    for (let i = 0; i < ids.length; i++) await ctx.db.patch(ids[i], { order: i });
  },
});

export const removeBanner = mutation({
  args: { id: v.id("banners") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "content");
    const existing = await ctx.db.get(id);
    await ctx.db.delete(id);
    if (existing) await cleanupReplacedImages(ctx, [existing.image, existing.mobileImage], []);
  },
});
