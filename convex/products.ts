import { v, ConvexError, type ObjectType } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { requirePermission } from "./lib/permissions";
import { vImage, vProductStatus, vSeo, vSpec } from "./lib/validators";
import {
  buildProductSearchText,
  categoryTreeIds,
  sortProducts,
  toCards,
  toProductDetail,
  type SortKey,
} from "./lib/catalog";
import { clean, dayKey, requireText, roundMoney, slugify } from "./lib/utils";
import { logStock } from "./lib/stock";

/* -------------------------------------------------------------------------- */
/*                                   Public                                   */
/* -------------------------------------------------------------------------- */

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!product || product.status !== "published") {
      const redirect = await ctx.db
        .query("slugRedirects")
        .withIndex("by_entity_from", (q) => q.eq("entity", "product").eq("fromSlug", slug))
        .first();
      if (redirect) return { kind: "redirect" as const, slug: redirect.toSlug };
      return null;
    }
    const [brand, category] = await Promise.all([
      product.brandId ? ctx.db.get(product.brandId) : null,
      ctx.db.get(product.categoryId),
    ]);
    const parent = category?.parentId ? await ctx.db.get(category.parentId) : null;
    return {
      kind: "product" as const,
      product: toProductDetail(product, brand, category, parent),
    };
  },
});

const vSort = v.union(
  v.literal("newest"),
  v.literal("price_asc"),
  v.literal("price_desc"),
  v.literal("popular"),
  v.literal("discount"),
);

/**
 * Filtered, sorted and paginated product listing used by category, brand,
 * search and "all products" pages. Catalog sizes for a single store are small
 * enough that in-memory faceting over an indexed candidate set is efficient.
 */
export const listing = query({
  args: {
    categorySlug: v.optional(v.string()),
    brandSlug: v.optional(v.string()),
    q: v.optional(v.string()),
    onSale: v.optional(v.boolean()),
    sort: v.optional(vSort),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    brands: v.optional(v.array(v.string())),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    inStock: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const pageSize = Math.min(Math.max(args.pageSize ?? 24, 1), 60);
    let candidates: Doc<"products">[] = [];
    const term = args.q?.trim();

    if (term) {
      const bySku = await ctx.db
        .query("products")
        .withIndex("by_sku", (q) => q.eq("sku", term.toUpperCase()))
        .collect();
      const found = await ctx.db
        .query("products")
        .withSearchIndex("search_text", (q) => q.search("searchText", term).eq("status", "published"))
        .take(200);
      const seen = new Set<string>();
      candidates = [...bySku.filter((p) => p.status === "published"), ...found].filter((p) => {
        if (seen.has(p._id)) return false;
        seen.add(p._id);
        return true;
      });
    } else if (args.categorySlug) {
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug!))
        .unique();
      if (!category || !category.isActive) return null;
      const ids = await categoryTreeIds(ctx, category._id);
      const lists = await Promise.all(
        ids.map((id) =>
          ctx.db
            .query("products")
            .withIndex("by_category_status", (q) => q.eq("categoryId", id).eq("status", "published"))
            .collect(),
        ),
      );
      candidates = lists.flat();
    } else if (args.brandSlug) {
      const brand = await ctx.db
        .query("brands")
        .withIndex("by_slug", (q) => q.eq("slug", args.brandSlug!))
        .unique();
      if (!brand || !brand.isActive) return null;
      candidates = await ctx.db
        .query("products")
        .withIndex("by_brand_status", (q) => q.eq("brandId", brand._id).eq("status", "published"))
        .collect();
    } else {
      candidates = await ctx.db
        .query("products")
        .withIndex("by_status", (q) => q.eq("status", "published"))
        .collect();
    }

    if (args.onSale) candidates = candidates.filter((p) => p.oldPrice && p.oldPrice > p.price);

    // Facets are computed before user filters so options don't disappear.
    const brandIds = Array.from(
      new Set(candidates.map((p) => p.brandId).filter((x): x is Id<"brands"> => !!x)),
    );
    const brandDocs = (await Promise.all(brandIds.map((id) => ctx.db.get(id)))).filter(
      (b): b is Doc<"brands"> => !!b,
    );
    const brandFacets = brandDocs
      .map((b) => ({
        slug: b.slug,
        name: b.name,
        count: candidates.filter((p) => p.brandId === b._id).length,
      }))
      .sort((a, b) => b.count - a.count);
    const prices = candidates.map((p) => p.price);
    const priceRange = {
      min: prices.length ? Math.floor(Math.min(...prices)) : 0,
      max: prices.length ? Math.ceil(Math.max(...prices)) : 0,
    };

    let filtered = candidates;
    if (args.brands?.length) {
      const allowed = new Set(brandDocs.filter((b) => args.brands!.includes(b.slug)).map((b) => b._id));
      filtered = filtered.filter((p) => p.brandId && allowed.has(p.brandId));
    }
    if (args.minPrice !== undefined) filtered = filtered.filter((p) => p.price >= args.minPrice!);
    if (args.maxPrice !== undefined) filtered = filtered.filter((p) => p.price <= args.maxPrice!);
    if (args.inStock) filtered = filtered.filter((p) => p.stock > 0);

    // With a search term and no explicit sort, keep relevance order.
    const sorted =
      term && !args.sort ? filtered : sortProducts(filtered, (args.sort ?? "newest") as SortKey);
    const total = sorted.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, Math.floor(args.page ?? 1)), pageCount);
    const slice = sorted.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: await toCards(ctx, slice),
      total,
      page,
      pageCount,
      pageSize,
      facets: { brands: brandFacets, priceRange },
    };
  },
});

export const related = query({
  args: { productId: v.id("products"), limit: v.optional(v.number()) },
  handler: async (ctx, { productId, limit }) => {
    const product = await ctx.db.get(productId);
    if (!product) return [];
    const max = Math.min(limit ?? 8, 16);
    const sameCategory = await ctx.db
      .query("products")
      .withIndex("by_category_status", (q) =>
        q.eq("categoryId", product.categoryId).eq("status", "published"),
      )
      .take(40);
    let list = sameCategory.filter((p) => p._id !== productId);
    if (list.length < max && product.brandId) {
      const sameBrand = await ctx.db
        .query("products")
        .withIndex("by_brand_status", (q) => q.eq("brandId", product.brandId).eq("status", "published"))
        .take(20);
      const ids = new Set(list.map((p) => p._id));
      list = [...list, ...sameBrand.filter((p) => p._id !== productId && !ids.has(p._id))];
    }
    // Prefer in-stock items with closest price.
    list.sort(
      (a, b) =>
        Number(b.stock > 0) - Number(a.stock > 0) ||
        Math.abs(a.price - product.price) - Math.abs(b.price - product.price),
    );
    return toCards(ctx, list.slice(0, max));
  },
});

/** Public cards for a list of ids (recently viewed, cart revalidation). */
export const byIds = query({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, { ids }) => {
    const docs: Doc<"products">[] = [];
    for (const raw of ids.slice(0, 50)) {
      const id = ctx.db.normalizeId("products", raw);
      if (!id) continue;
      const p = await ctx.db.get(id);
      if (p && p.status === "published") docs.push(p);
    }
    return toCards(ctx, docs);
  },
});

export const suggest = query({
  args: { q: v.string() },
  handler: async (ctx, { q }) => {
    const term = q.trim();
    if (term.length < 2) return { products: [], categories: [], brands: [] };
    const products = await ctx.db
      .query("products")
      .withSearchIndex("search_text", (s) => s.search("searchText", term).eq("status", "published"))
      .take(6);
    const lower = term.toLowerCase();
    const categories = (await ctx.db.query("categories").withIndex("by_order").collect())
      .filter(
        (c) =>
          c.isActive &&
          (c.nameFr.toLowerCase().includes(lower) || c.nameAr.includes(term)),
      )
      .slice(0, 4)
      .map((c) => ({ slug: c.slug, nameFr: c.nameFr, nameAr: c.nameAr }));
    const brands = (await ctx.db.query("brands").withIndex("by_order").collect())
      .filter((b) => b.isActive && b.name.toLowerCase().includes(lower))
      .slice(0, 4)
      .map((b) => ({ slug: b.slug, name: b.name }));
    return { products: await toCards(ctx, products), categories, brands };
  },
});

export const recordView = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const product = await ctx.db.get(productId);
    if (!product || product.status !== "published") return;
    const day = dayKey(Date.now());
    const row = await ctx.db
      .query("productViews")
      .withIndex("by_product_day", (q) => q.eq("productId", productId).eq("day", day))
      .unique();
    if (row) await ctx.db.patch(row._id, { count: row.count + 1 });
    else await ctx.db.insert("productViews", { productId, day, count: 1 });
    await ctx.db.patch(productId, { viewCount: product.viewCount + 1 });
  },
});

export const sitemapEntries = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    const categories = (await ctx.db.query("categories").collect()).filter((c) => c.isActive);
    const brands = (await ctx.db.query("brands").collect()).filter((b) => b.isActive);
    return {
      products: products
        .filter((p) => !p.seo?.noindex)
        .map((p) => ({ slug: p.slug, updatedAt: p.updatedAt, image: p.images[0]?.url })),
      categories: categories
        .filter((c) => !c.seo?.noindex)
        .map((c) => ({ slug: c.slug, updatedAt: c.updatedAt })),
      brands: brands.map((b) => ({ slug: b.slug, updatedAt: b.updatedAt })),
    };
  },
});

/* -------------------------------------------------------------------------- */
/*                                    Admin                                   */
/* -------------------------------------------------------------------------- */

const productInput = {
  nameFr: v.string(),
  nameAr: v.string(),
  slug: v.optional(v.string()),
  descriptionFr: v.string(),
  descriptionAr: v.string(),
  shortDescriptionFr: v.optional(v.string()),
  shortDescriptionAr: v.optional(v.string()),
  brandId: v.optional(v.id("brands")),
  categoryId: v.id("categories"),
  sku: v.string(),
  barcode: v.optional(v.string()),
  purchasePrice: v.optional(v.number()),
  price: v.number(),
  oldPrice: v.optional(v.number()),
  stock: v.number(),
  minStockAlert: v.number(),
  warrantyFr: v.optional(v.string()),
  warrantyAr: v.optional(v.string()),
  specs: v.array(vSpec),
  images: v.array(vImage),
  isFeatured: v.boolean(),
  isBestSeller: v.boolean(),
  status: vProductStatus,
  seo: v.optional(vSeo),
};

type ProductInput = ObjectType<typeof productInput>;

async function uniqueSlug(ctx: QueryCtx, base: string, excludeId?: Id<"products">) {
  const root = slugify(base);
  let candidate = root;
  for (let i = 2; i < 200; i++) {
    const existing = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (!existing || existing._id === excludeId) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

async function normalizeInput(ctx: MutationCtx, input: ProductInput, excludeId?: Id<"products">) {
  const nameFr = requireText(input.nameFr, "Nom (FR)", 200);
  const nameAr = requireText(input.nameAr, "Nom (AR)", 200);
  const sku = requireText(input.sku, "SKU", 64).toUpperCase();
  const dupSku = await ctx.db
    .query("products")
    .withIndex("by_sku", (q) => q.eq("sku", sku))
    .first();
  if (dupSku && dupSku._id !== excludeId) {
    throw new ConvexError({ code: "INVALID", message: `Le SKU « ${sku} » est déjà utilisé.` });
  }
  if (!(input.price >= 0) || !Number.isFinite(input.price)) {
    throw new ConvexError({ code: "INVALID", message: "Prix de vente invalide." });
  }
  if (!Number.isInteger(input.stock) || input.stock < 0) {
    throw new ConvexError({ code: "INVALID", message: "Le stock doit être un entier positif." });
  }
  const category = await ctx.db.get(input.categoryId);
  if (!category) throw new ConvexError({ code: "INVALID", message: "Catégorie introuvable." });
  const brand = input.brandId ? await ctx.db.get(input.brandId) : null;
  if (input.brandId && !brand) throw new ConvexError({ code: "INVALID", message: "Marque introuvable." });
  if (input.images.length > 15) {
    throw new ConvexError({ code: "INVALID", message: "15 images maximum par produit." });
  }

  const slug = await uniqueSlug(ctx, clean(input.slug) ?? nameFr, excludeId);
  const parent = category.parentId ? await ctx.db.get(category.parentId) : null;
  const base = {
    nameFr,
    nameAr,
    slug,
    descriptionFr: input.descriptionFr.trim(),
    descriptionAr: input.descriptionAr.trim(),
    shortDescriptionFr: clean(input.shortDescriptionFr),
    shortDescriptionAr: clean(input.shortDescriptionAr),
    brandId: input.brandId,
    categoryId: input.categoryId,
    sku,
    barcode: clean(input.barcode),
    purchasePrice: input.purchasePrice !== undefined ? roundMoney(input.purchasePrice) : undefined,
    price: roundMoney(input.price),
    oldPrice:
      input.oldPrice !== undefined && input.oldPrice > input.price ? roundMoney(input.oldPrice) : undefined,
    stock: input.stock,
    minStockAlert: Math.max(0, Math.floor(input.minStockAlert)),
    warrantyFr: clean(input.warrantyFr),
    warrantyAr: clean(input.warrantyAr),
    specs: input.specs.filter((s) => s.labelFr.trim() || s.labelAr.trim()),
    images: input.images,
    isFeatured: input.isFeatured,
    isBestSeller: input.isBestSeller,
    status: input.status,
    seo: input.seo,
    updatedAt: Date.now(),
  };
  const searchText = buildProductSearchText(
    base,
    brand?.name,
    [category.nameFr, category.nameAr, parent?.nameFr ?? "", parent?.nameAr ?? ""],
  );
  return { ...base, searchText };
}

/** Schedules Cloudinary deletion for images no longer referenced by any product. */
async function scheduleOrphanImageCleanup(ctx: MutationCtx, publicIds: string[]) {
  if (!publicIds.length) return;
  const all = await ctx.db.query("products").collect();
  const used = new Set(all.flatMap((p) => p.images.map((i) => i.publicId)));
  const orphans = publicIds.filter((id) => !used.has(id));
  if (orphans.length) {
    await ctx.scheduler.runAfter(0, internal.cloudinary.destroyMany, { publicIds: orphans });
  }
}

export const adminList = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    status: v.optional(vProductStatus),
    categoryId: v.optional(v.id("categories")),
    stock: v.optional(v.union(v.literal("low"), v.literal("out"))),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "catalog");
    const term = args.search?.trim();
    let q;
    if (term) {
      q = ctx.db.query("products").withSearchIndex("search_text", (s) => {
        let b = s.search("searchText", term);
        if (args.status) b = b.eq("status", args.status);
        if (args.categoryId) b = b.eq("categoryId", args.categoryId);
        return b;
      });
    } else if (args.categoryId) {
      q = ctx.db
        .query("products")
        .withIndex("by_category_status", (s) =>
          args.status
            ? s.eq("categoryId", args.categoryId!).eq("status", args.status)
            : s.eq("categoryId", args.categoryId!),
        )
        .order("desc");
    } else if (args.status) {
      q = ctx.db
        .query("products")
        .withIndex("by_status", (s) => s.eq("status", args.status!))
        .order("desc");
    } else {
      q = ctx.db.query("products").order("desc");
    }
    if (args.stock === "out") q = q.filter((f) => f.lte(f.field("stock"), 0));
    if (args.stock === "low")
      q = q.filter((f) =>
        f.and(f.gt(f.field("stock"), 0), f.lte(f.field("stock"), f.field("minStockAlert"))),
      );
    const result = await q.paginate(args.paginationOpts);
    const categoryIds = Array.from(new Set(result.page.map((p) => p.categoryId)));
    const cats = await Promise.all(categoryIds.map((id) => ctx.db.get(id)));
    const catMap = new Map(cats.filter(Boolean).map((c) => [c!._id, c!.nameFr]));
    return {
      ...result,
      page: result.page.map((p) => ({
        _id: p._id,
        nameFr: p.nameFr,
        nameAr: p.nameAr,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        oldPrice: p.oldPrice,
        purchasePrice: p.purchasePrice,
        stock: p.stock,
        minStockAlert: p.minStockAlert,
        status: p.status,
        isFeatured: p.isFeatured,
        isBestSeller: p.isBestSeller,
        image: p.images[0] ?? null,
        categoryName: catMap.get(p.categoryId) ?? "—",
        salesCount: p.salesCount,
        updatedAt: p.updatedAt,
      })),
    };
  },
});

export const adminGet = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "catalog");
    return ctx.db.get(id);
  },
});

/** Lightweight picker list for homepage curation. */
export const adminPicker = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, { search }) => {
    await requirePermission(ctx, "content");
    const term = search?.trim();
    const docs = term
      ? await ctx.db
          .query("products")
          .withSearchIndex("search_text", (s) => s.search("searchText", term))
          .take(20)
      : await ctx.db.query("products").order("desc").take(20);
    return docs.map((p) => ({
      _id: p._id,
      nameFr: p.nameFr,
      sku: p.sku,
      status: p.status,
      image: p.images[0] ?? null,
      price: p.price,
    }));
  },
});

export const adminGetMany = query({
  args: { ids: v.array(v.id("products")) },
  handler: async (ctx, { ids }) => {
    await requirePermission(ctx, "content");
    const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return docs
      .filter((p): p is Doc<"products"> => !!p)
      .map((p) => ({ _id: p._id, nameFr: p.nameFr, sku: p.sku, image: p.images[0] ?? null, status: p.status }));
  },
});

export const create = mutation({
  args: productInput,
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog");
    const data = await normalizeInput(ctx, args);
    const id = await ctx.db.insert("products", { ...data, salesCount: 0, viewCount: 0 });
    await logStock(ctx, { productId: id, delta: data.stock, stockAfter: data.stock, reason: "initial", userId: user._id });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("products"), ...productInput },
  handler: async (ctx, { id, ...args }) => {
    const user = await requirePermission(ctx, "catalog");
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Produit introuvable." });
    const data = await normalizeInput(ctx, args, id);
    if (data.slug !== existing.slug) {
      // Keep the old URL working with a permanent redirect.
      const chain = await ctx.db
        .query("slugRedirects")
        .withIndex("by_entity_from")
        .filter((f) => f.and(f.eq(f.field("entity"), "product"), f.eq(f.field("toSlug"), existing.slug)))
        .collect();
      for (const r of chain) await ctx.db.patch(r._id, { toSlug: data.slug });
      const loop = await ctx.db
        .query("slugRedirects")
        .withIndex("by_entity_from", (q) => q.eq("entity", "product").eq("fromSlug", data.slug))
        .collect();
      for (const r of loop) await ctx.db.delete(r._id);
      await ctx.db.insert("slugRedirects", { entity: "product", fromSlug: existing.slug, toSlug: data.slug });
    }
    await ctx.db.patch(id, data);
    await logStock(ctx, { productId: id, delta: data.stock - existing.stock, stockAfter: data.stock, reason: "adjust", note: "Fiche produit", userId: user._id });
    const kept = new Set(data.images.map((i) => i.publicId));
    await scheduleOrphanImageCleanup(
      ctx,
      existing.images.map((i) => i.publicId).filter((p) => !kept.has(p)),
    );
    return id;
  },
});

export const duplicate = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "catalog");
    const p = await ctx.db.get(id);
    if (!p) throw new ConvexError({ code: "NOT_FOUND", message: "Produit introuvable." });
    // A copy is a separate product: it doesn't stay linked to Electro Darna.
    const { _id, _creationTime, sourceId, sourceSyncedAt, ...rest } = p;
    void _id;
    void _creationTime;
    void sourceId;
    void sourceSyncedAt;
    let sku = `${p.sku}-COPY`;
    for (let i = 2; await ctx.db.query("products").withIndex("by_sku", (q) => q.eq("sku", sku)).first(); i++) {
      sku = `${p.sku}-COPY${i}`;
    }
    return ctx.db.insert("products", {
      ...rest,
      nameFr: `${p.nameFr} (copie)`,
      nameAr: `${p.nameAr} (نسخة)`,
      slug: await uniqueSlug(ctx, `${p.slug}-copie`),
      sku,
      status: "draft",
      salesCount: 0,
      viewCount: 0,
      updatedAt: Date.now(),
    });
  },
});

async function deleteProduct(ctx: MutationCtx, id: Id<"products">) {
  const p = await ctx.db.get(id);
  if (!p) return [];
  await ctx.db.delete(id);
  const views = await ctx.db
    .query("productViews")
    .withIndex("by_product_day", (q) => q.eq("productId", id))
    .collect();
  for (const v of views) await ctx.db.delete(v._id);
  const linked = await Promise.all([
    ctx.db.query("wishlists").withIndex("by_product", (q) => q.eq("productId", id)).collect(),
    ctx.db.query("reviews").withIndex("by_product_status", (q) => q.eq("productId", id)).collect(),
    ctx.db.query("stockMovements").withIndex("by_product", (q) => q.eq("productId", id)).collect(),
  ]);
  for (const rows of linked) for (const r of rows) await ctx.db.delete(r._id);
  return p.images.map((i) => i.publicId);
}

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "catalog");
    const images = await deleteProduct(ctx, id);
    await scheduleOrphanImageCleanup(ctx, images);
  },
});

export const bulkDelete = mutation({
  args: { ids: v.array(v.id("products")) },
  handler: async (ctx, { ids }) => {
    await requirePermission(ctx, "catalog");
    if (ids.length > 100) throw new ConvexError({ code: "INVALID", message: "100 produits maximum par opération." });
    const images: string[] = [];
    for (const id of ids) images.push(...(await deleteProduct(ctx, id)));
    await scheduleOrphanImageCleanup(ctx, images);
    return ids.length;
  },
});

export const bulkUpdate = mutation({
  args: {
    ids: v.array(v.id("products")),
    patch: v.object({
      status: v.optional(vProductStatus),
      isFeatured: v.optional(v.boolean()),
      isBestSeller: v.optional(v.boolean()),
      categoryId: v.optional(v.id("categories")),
      discountPercent: v.optional(v.number()),
      clearDiscount: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { ids, patch }) => {
    await requirePermission(ctx, "catalog");
    if (ids.length > 100) throw new ConvexError({ code: "INVALID", message: "100 produits maximum par opération." });
    if (patch.discountPercent !== undefined && (patch.discountPercent <= 0 || patch.discountPercent >= 95)) {
      throw new ConvexError({ code: "INVALID", message: "Remise invalide (1 à 94 %)." });
    }
    for (const id of ids) {
      const p = await ctx.db.get(id);
      if (!p) continue;
      const update: Partial<Doc<"products">> = { updatedAt: Date.now() };
      if (patch.status) update.status = patch.status;
      if (patch.isFeatured !== undefined) update.isFeatured = patch.isFeatured;
      if (patch.isBestSeller !== undefined) update.isBestSeller = patch.isBestSeller;
      if (patch.categoryId) update.categoryId = patch.categoryId;
      if (patch.discountPercent) {
        const reference = p.oldPrice && p.oldPrice > p.price ? p.oldPrice : p.price;
        update.oldPrice = reference;
        update.price = roundMoney(reference * (1 - patch.discountPercent / 100));
      }
      if (patch.clearDiscount && p.oldPrice) {
        update.price = p.oldPrice;
        update.oldPrice = undefined;
      }
      await ctx.db.patch(id, update);
    }
    return ids.length;
  },
});

export const quickUpdate = mutation({
  args: {
    id: v.id("products"),
    status: v.optional(vProductStatus),
    isFeatured: v.optional(v.boolean()),
    isBestSeller: v.optional(v.boolean()),
    stock: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const user = await requirePermission(ctx, "catalog");
    if (patch.stock !== undefined && (!Number.isInteger(patch.stock) || patch.stock < 0)) {
      throw new ConvexError({ code: "INVALID", message: "Stock invalide." });
    }
    const before = await ctx.db.get(id);
    if (!before) throw new ConvexError({ code: "NOT_FOUND", message: "Produit introuvable." });
    const clean = Object.fromEntries(Object.entries(patch).filter(([, val]) => val !== undefined));
    await ctx.db.patch(id, { ...clean, updatedAt: Date.now() });
    if (patch.stock !== undefined) {
      await logStock(ctx, { productId: id, delta: patch.stock - before.stock, stockAfter: patch.stock, reason: "adjust", userId: user._id });
    }
  },
});

export const slugAvailable = query({
  args: { slug: v.string(), excludeId: v.optional(v.id("products")) },
  handler: async (ctx, { slug, excludeId }) => {
    await requirePermission(ctx, "catalog");
    const s = slugify(slug);
    const existing = await ctx.db.query("products").withIndex("by_slug", (q) => q.eq("slug", s)).unique();
    return { slug: s, available: !existing || existing._id === excludeId };
  },
});
