import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction, internalMutation, internalQuery, query, type ActionCtx } from "./_generated/server";
import { requirePermission } from "./lib/permissions";
import { buildProductSearchText } from "./lib/catalog";
import { roundMoney, slugify } from "./lib/utils";
import { uploadFromUrl } from "./cloudinary";

/**
 * Link with the Electro Darna shop (its feed: electro-darna/convex/catalogShare.ts).
 * Convex env: ELECTRODARNA_API_URL (https://<deployment>.convex.site), ELECTRODARNA_API_KEY (= its CATALOG_SHARE_KEY).
 */

export type RemoteProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  brandSlug: string | null;
  category: string | null;
  categoryName: string | null;
  description: string;
  warranty: string | null;
  price: number; // DH
  compareAtPrice: number | null; // DH
  stock: number | null; // null = not tracked by quantity
  available: boolean;
  isActive: boolean;
  imageUrls: string[];
  updatedAt: number;
};

/** Stock given to a product Electro Darna marks "in stock" without tracking a quantity. */
const UNTRACKED_AVAILABLE_STOCK = 10;
const MAX_IMAGES = 15;

const remoteStock = (p: RemoteProduct | undefined) => (!p || !p.available ? 0 : (p.stock ?? UNTRACKED_AVAILABLE_STOCK));

function fail(message: string): never {
  throw new ConvexError({ code: "INVALID", message });
}

async function callFeed(ids?: string[]): Promise<RemoteProduct[]> {
  const base = process.env.ELECTRODARNA_API_URL;
  const key = process.env.ELECTRODARNA_API_KEY;
  if (!base || !key) fail("Le lien n'est pas configuré : ajoutez ELECTRODARNA_API_URL et ELECTRODARNA_API_KEY dans l'environnement Convex.");
  const res = await fetch(`${base.replace(/\/$/, "")}/api/catalog/products`, {
    method: ids ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: ids ? JSON.stringify({ ids }) : undefined,
  });
  if (!res.ok) fail(`Electro Darna a répondu ${res.status}`);
  return ((await res.json()) as { items: RemoteProduct[] }).items;
}

async function fetchByIds(ids: string[]) {
  const out: RemoteProduct[] = [];
  for (let i = 0; i < ids.length; i += 1000) out.push(...(await callFeed(ids.slice(i, i + 1000))));
  return out;
}

// Actions have no db access: permission is checked through a query.
export const _requireCatalog = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "catalog");
    return true;
  },
});

// ── Browse ─────────────────────────────────────────────────

/** Remote catalog for the admin page. */
export const catalog = action({
  args: {},
  handler: async (ctx): Promise<RemoteProduct[]> => {
    await ctx.runQuery(internal.electrodarna._requireCatalog, {});
    return callFeed();
  },
});

/** Local products cloned from Electro Darna, keyed by their source id. */
export const linked = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "catalog");
    const products = await ctx.db.query("products").collect();
    return products
      .filter((p) => p.sourceId)
      .map((p) => ({ id: p._id, sourceId: p.sourceId!, stock: p.stock, price: p.price, sourceSyncedAt: p.sourceSyncedAt ?? null }));
  },
});

// ── Clone ──────────────────────────────────────────────────

export const linkedIds = internalQuery({
  args: {},
  handler: async (ctx) =>
    (await ctx.db.query("products").collect()).filter((p) => p.sourceId).map((p) => ({ id: p._id, sourceId: p.sourceId! })),
});

export const createClone = internalMutation({
  args: {
    remote: v.any(),
    images: v.array(v.object({ publicId: v.string(), url: v.string(), width: v.optional(v.number()), height: v.optional(v.number()) })),
    status: v.union(v.literal("draft"), v.literal("published")),
    fallbackCategoryId: v.id("categories"),
  },
  handler: async (ctx, { remote, images, status, fallbackCategoryId }) => {
    const p = remote as RemoteProduct;
    if (await ctx.db.query("products").withIndex("by_source", (q) => q.eq("sourceId", p.id)).first()) return { created: false };

    // Brand: reuse by slug, create it otherwise.
    let brandId: Id<"brands"> | undefined;
    let brandName: string | undefined;
    if (p.brand) {
      const slug = p.brandSlug || slugify(p.brand);
      const brand = await ctx.db.query("brands").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
      if (brand) brandId = brand._id;
      else {
        const last = await ctx.db.query("brands").withIndex("by_order").order("desc").first();
        brandId = await ctx.db.insert("brands", { name: p.brand, slug, isActive: true, isFeatured: false, order: (last?.order ?? 0) + 1, updatedAt: Date.now() });
      }
      brandName = p.brand;
    }

    // Category: matched by slug, otherwise the one chosen in the import dialog.
    let categoryId: Id<"categories"> | undefined;
    for (const slug of [p.category, p.categoryName ? slugify(p.categoryName) : null]) {
      if (!slug || categoryId) continue;
      categoryId = (await ctx.db.query("categories").withIndex("by_slug", (q) => q.eq("slug", slug)).first())?._id;
    }
    const category = await ctx.db.get(categoryId ?? fallbackCategoryId);
    if (!category) fail("Catégorie introuvable.");
    const parent = category.parentId ? await ctx.db.get(category.parentId) : null;

    const unique = async (base: string, index: "by_slug" | "by_sku") => {
      const taken = async (s: string) =>
        Boolean(await ctx.db.query("products").withIndex(index, (q) => q.eq(index === "by_slug" ? "slug" : "sku", s)).first());
      if (!(await taken(base))) return base;
      for (let i = 2; i < 100; i++) if (!(await taken(`${base}-${i}`))) return `${base}-${i}`;
      return `${base}-${crypto.randomUUID().slice(0, 6)}`;
    };

    const name = p.name.slice(0, 200);
    const price = roundMoney(p.price);
    const oldPrice = p.compareAtPrice && p.compareAtPrice > p.price ? roundMoney(p.compareAtPrice) : undefined;
    const now = Date.now();
    // Electro Darna is French-only: the Arabic fields start as copies, to translate in the product form.
    const base = {
      nameFr: name,
      nameAr: name,
      slug: await unique(slugify(p.slug || p.name), "by_slug"),
      descriptionFr: p.description ?? "",
      descriptionAr: p.description ?? "",
      brandId,
      categoryId: category._id,
      sku: await unique(`ED-${p.id.slice(-8).toUpperCase()}`, "by_sku"),
      price,
      oldPrice,
      stock: remoteStock(p),
      minStockAlert: 3,
      warrantyFr: p.warranty ?? undefined,
      warrantyAr: p.warranty ?? undefined,
      specs: [],
      images: images.map((i) => ({ ...i, alt: name })),
      isFeatured: false,
      isBestSeller: false,
      status,
      salesCount: 0,
      viewCount: 0,
      sourceId: p.id,
      sourceSyncedAt: now,
      updatedAt: now,
    };
    const searchText = buildProductSearchText(base, brandName, [category.nameFr, category.nameAr, parent?.nameFr ?? "", parent?.nameAr ?? ""]);
    await ctx.db.insert("products", { ...base, searchText });
    return { created: true };
  },
});

export const importProducts = action({
  args: {
    ids: v.array(v.string()),
    status: v.union(v.literal("draft"), v.literal("published")),
    fallbackCategoryId: v.id("categories"),
  },
  handler: async (ctx, { ids, status, fallbackCategoryId }): Promise<{ created: number; skipped: number; failed: string[] }> => {
    await ctx.runQuery(internal.electrodarna._requireCatalog, {});
    if (!ids.length || ids.length > 50) fail("Sélectionnez entre 1 et 50 produits.");
    const remote = await fetchByIds(ids);
    if (!remote.length) fail("Produits introuvables sur Electro Darna.");
    const already = new Set((await ctx.runQuery(internal.electrodarna.linkedIds, {})).map((l) => l.sourceId));

    let created = 0;
    let skipped = 0;
    const failed: string[] = [];
    for (const p of remote) {
      if (already.has(p.id)) {
        skipped++;
        continue;
      }
      const images: { publicId: string; url: string; width?: number; height?: number }[] = [];
      const cleanup = () =>
        images.length ? ctx.runAction(internal.cloudinary.destroyMany, { publicIds: images.map((i) => i.publicId) }) : null;
      try {
        for (const url of p.imageUrls.slice(0, MAX_IMAGES)) {
          try {
            images.push(await uploadFromUrl(url, "products"));
          } catch (err) {
            console.warn("Electro Darna image import failed", url, err);
          }
        }
        const res = await ctx.runMutation(internal.electrodarna.createClone, { remote: p, images, status, fallbackCategoryId });
        if (res.created) created++;
        else {
          skipped++;
          await cleanup();
        }
      } catch (err) {
        console.error("Electro Darna clone failed", p.id, err);
        await cleanup();
        failed.push(p.name);
      }
    }
    return { created, skipped, failed };
  },
});

// ── Stock sync ─────────────────────────────────────────────

export const applyStock = internalMutation({
  args: { levels: v.array(v.object({ id: v.id("products"), stock: v.number() })) },
  handler: async (ctx, { levels }) => {
    let updated = 0;
    const now = Date.now();
    for (const { id, stock } of levels) {
      const p = await ctx.db.get(id);
      if (!p) continue;
      if (p.stock !== stock) updated++;
      await ctx.db.patch(id, { stock, sourceSyncedAt: now });
    }
    return updated;
  },
});

type SyncResult = { checked: number; updated: number; outOfStock: number };

/**
 * Aligns the stock of every cloned product with Electro Darna.
 * Products removed or deactivated there fall to 0. Prices are left alone.
 */
async function runSync(ctx: ActionCtx): Promise<SyncResult> {
  const links = await ctx.runQuery(internal.electrodarna.linkedIds, {});
  if (!links.length) return { checked: 0, updated: 0, outOfStock: 0 };
  const remote = new Map((await fetchByIds(links.map((l) => l.sourceId))).map((p) => [p.id, p]));
  const levels = links.map((l) => ({ id: l.id, stock: remoteStock(remote.get(l.sourceId)) }));
  const updated: number = await ctx.runMutation(internal.electrodarna.applyStock, { levels });
  return { checked: links.length, updated, outOfStock: levels.filter((l) => l.stock === 0).length };
}

/** Scheduled from crons.ts. */
export const syncStock = internalAction({ args: {}, handler: (ctx): Promise<SyncResult> => runSync(ctx) });

/** "Synchroniser le stock" button. */
export const syncNow = action({
  args: {},
  handler: async (ctx): Promise<SyncResult> => {
    await ctx.runQuery(internal.electrodarna._requireCatalog, {});
    return runSync(ctx);
  },
});
