import { v, ConvexError } from "convex/values";
import { query, mutation, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requirePermission } from "./lib/permissions";
import { vImage, vSeo } from "./lib/validators";
import { clean, requireText, slugify } from "./lib/utils";
import { cleanupReplacedImages } from "./lib/images";
import { buildProductSearchText } from "./lib/catalog";

function toPublic(c: Doc<"categories">) {
  return {
    _id: c._id,
    slug: c.slug,
    nameFr: c.nameFr,
    nameAr: c.nameAr,
    descriptionFr: c.descriptionFr,
    descriptionAr: c.descriptionAr,
    image: c.image ?? null,
    banner: c.banner ?? null,
    icon: c.icon,
    parentId: c.parentId ?? null,
    order: c.order,
    showInMenu: c.showInMenu !== false,
  };
}
export type PublicCategory = ReturnType<typeof toPublic>;

/** Active categories as a flat ordered list (the client builds the tree). */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("categories").withIndex("by_order").collect();
    const active = all.filter((c) => c.isActive);
    const activeIds = new Set(active.map((c) => c._id));
    // Hide children whose parent is disabled.
    const visible = active.filter((c) => !c.parentId || activeIds.has(c.parentId));
    const counts = new Map<Id<"categories">, number>();
    const published = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    for (const p of published) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    return visible.map((c) => ({ ...toPublic(c), productCount: counts.get(c._id) ?? 0 }));
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const c = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!c || !c.isActive) {
      const redirect = await ctx.db
        .query("slugRedirects")
        .withIndex("by_entity_from", (q) => q.eq("entity", "category").eq("fromSlug", slug))
        .first();
      return redirect ? { kind: "redirect" as const, slug: redirect.toSlug } : null;
    }
    const parent = c.parentId ? await ctx.db.get(c.parentId) : null;
    const children = (
      await ctx.db
        .query("categories")
        .withIndex("by_parent", (q) => q.eq("parentId", c._id))
        .collect()
    ).filter((x) => x.isActive);
    return {
      kind: "category" as const,
      category: {
        ...toPublic(c),
        seo: c.seo ?? null,
        updatedAt: c.updatedAt,
        parent: parent && parent.isActive ? toPublic(parent) : null,
        children: children.map(toPublic),
      },
    };
  },
});

/* --------------------------------- Admin --------------------------------- */

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "catalog");
    const all = await ctx.db.query("categories").withIndex("by_order").collect();
    const products = await ctx.db.query("products").collect();
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    return all.map((c) => ({ ...c, productCount: counts.get(c._id) ?? 0 }));
  },
});

const categoryInput = {
  nameFr: v.string(),
  nameAr: v.string(),
  slug: v.optional(v.string()),
  descriptionFr: v.optional(v.string()),
  descriptionAr: v.optional(v.string()),
  image: v.optional(vImage),
  banner: v.optional(vImage),
  icon: v.optional(v.string()),
  parentId: v.optional(v.id("categories")),
  order: v.optional(v.number()),
  isActive: v.boolean(),
  showInMenu: v.optional(v.boolean()),
  seo: v.optional(vSeo),
};

async function uniqueSlug(ctx: MutationCtx, raw: string, excludeId?: Id<"categories">) {
  const root = slugify(raw);
  let candidate = root;
  for (let i = 2; ; i++) {
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (!existing || existing._id === excludeId) return candidate;
    candidate = `${root}-${i}`;
  }
}

async function assertNoCycle(ctx: MutationCtx, id: Id<"categories">, parentId?: Id<"categories">) {
  let cursor = parentId;
  let depth = 0;
  while (cursor) {
    if (cursor === id) throw new ConvexError({ code: "INVALID", message: "Une catégorie ne peut pas être son propre parent." });
    const parent: Doc<"categories"> | null = await ctx.db.get(cursor);
    cursor = parent?.parentId;
    if (++depth > 10) break;
  }
}

async function refreshProductsSearch(ctx: MutationCtx, categoryId: Id<"categories">) {
  const category = await ctx.db.get(categoryId);
  if (!category) return;
  const parent = category.parentId ? await ctx.db.get(category.parentId) : null;
  const products = await ctx.db
    .query("products")
    .withIndex("by_category_status", (q) => q.eq("categoryId", categoryId))
    .collect();
  for (const p of products) {
    const brand = p.brandId ? await ctx.db.get(p.brandId) : null;
    await ctx.db.patch(p._id, {
      searchText: buildProductSearchText(p, brand?.name, [
        category.nameFr,
        category.nameAr,
        parent?.nameFr ?? "",
        parent?.nameAr ?? "",
      ]),
    });
  }
}

export const create = mutation({
  args: categoryInput,
  handler: async (ctx, args) => {
    await requirePermission(ctx, "catalog");
    const nameFr = requireText(args.nameFr, "Nom (FR)", 120);
    const nameAr = requireText(args.nameAr, "Nom (AR)", 120);
    const last = await ctx.db.query("categories").withIndex("by_order").order("desc").first();
    return ctx.db.insert("categories", {
      ...args,
      nameFr,
      nameAr,
      slug: await uniqueSlug(ctx, clean(args.slug) ?? nameFr),
      descriptionFr: clean(args.descriptionFr),
      descriptionAr: clean(args.descriptionAr),
      order: args.order ?? (last ? last.order + 1 : 0),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: { id: v.id("categories"), ...categoryInput },
  handler: async (ctx, { id, ...args }) => {
    await requirePermission(ctx, "catalog");
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Catégorie introuvable." });
    await assertNoCycle(ctx, id, args.parentId);
    const slug = await uniqueSlug(ctx, clean(args.slug) ?? args.nameFr, id);
    if (slug !== existing.slug) {
      const loops = await ctx.db
        .query("slugRedirects")
        .withIndex("by_entity_from", (q) => q.eq("entity", "category").eq("fromSlug", slug))
        .collect();
      for (const r of loops) await ctx.db.delete(r._id);
      await ctx.db.insert("slugRedirects", { entity: "category", fromSlug: existing.slug, toSlug: slug });
    }
    await ctx.db.patch(id, {
      ...args,
      nameFr: requireText(args.nameFr, "Nom (FR)", 120),
      nameAr: requireText(args.nameAr, "Nom (AR)", 120),
      slug,
      descriptionFr: clean(args.descriptionFr),
      descriptionAr: clean(args.descriptionAr),
      order: args.order ?? existing.order,
      updatedAt: Date.now(),
    });
    await cleanupReplacedImages(ctx, [existing.image, existing.banner], [args.image, args.banner]);
    if (existing.nameFr !== args.nameFr || existing.nameAr !== args.nameAr) {
      await refreshProductsSearch(ctx, id);
    }
  },
});

export const toggleActive = mutation({
  args: { id: v.id("categories"), isActive: v.boolean() },
  handler: async (ctx, { id, isActive }) => {
    await requirePermission(ctx, "catalog");
    await ctx.db.patch(id, { isActive, updatedAt: Date.now() });
  },
});

export const reorder = mutation({
  args: { ids: v.array(v.id("categories")) },
  handler: async (ctx, { ids }) => {
    await requirePermission(ctx, "catalog");
    for (let i = 0; i < ids.length; i++) await ctx.db.patch(ids[i], { order: i });
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "catalog");
    const product = await ctx.db
      .query("products")
      .withIndex("by_category_status", (q) => q.eq("categoryId", id))
      .first();
    if (product) {
      throw new ConvexError({
        code: "IN_USE",
        message: "Cette catégorie contient des produits. Déplacez-les avant de la supprimer.",
      });
    }
    const child = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentId", id))
      .first();
    if (child) {
      throw new ConvexError({ code: "IN_USE", message: "Supprimez ou déplacez d'abord les sous-catégories." });
    }
    const existing = await ctx.db.get(id);
    await ctx.db.delete(id);
    if (existing) await cleanupReplacedImages(ctx, [existing.image, existing.banner], []);
  },
});
