import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type BrandLite = { _id: Id<"brands">; name: string; slug: string };

/** Card-level public projection. Never includes purchasePrice or admin fields. */
export function toProductCard(p: Doc<"products">, brand?: BrandLite | null) {
  const discount =
    p.oldPrice && p.oldPrice > p.price
      ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)
      : 0;
  return {
    _id: p._id,
    _creationTime: p._creationTime,
    slug: p.slug,
    nameFr: p.nameFr,
    nameAr: p.nameAr,
    price: p.price,
    oldPrice: p.oldPrice,
    discount,
    image: p.images[0] ?? null,
    hoverImage: p.images[1] ?? null,
    stock: Math.max(0, p.stock),
    lowStock: p.stock > 0 && p.stock <= p.minStockAlert,
    isBestSeller: p.isBestSeller,
    isFeatured: p.isFeatured,
    categoryId: p.categoryId,
    brand: brand ? { name: brand.name, slug: brand.slug } : null,
    sku: p.sku,
    ratingAvg: p.ratingAvg ?? 0,
    ratingCount: p.ratingCount ?? 0,
  };
}
export type ProductCard = ReturnType<typeof toProductCard>;

/** Full public projection for the product page. */
export function toProductDetail(
  p: Doc<"products">,
  brand: Doc<"brands"> | null,
  category: Doc<"categories"> | null,
  parentCategory: Doc<"categories"> | null,
) {
  return {
    ...toProductCard(p, brand),
    descriptionFr: p.descriptionFr,
    descriptionAr: p.descriptionAr,
    shortDescriptionFr: p.shortDescriptionFr,
    shortDescriptionAr: p.shortDescriptionAr,
    barcode: p.barcode,
    warrantyFr: p.warrantyFr,
    warrantyAr: p.warrantyAr,
    specs: p.specs,
    images: p.images,
    seo: p.seo ?? null,
    updatedAt: p.updatedAt,
    brandDetail: brand
      ? { _id: brand._id, name: brand.name, slug: brand.slug, logo: brand.logo ?? null }
      : null,
    category: category
      ? { _id: category._id, slug: category.slug, nameFr: category.nameFr, nameAr: category.nameAr }
      : null,
    parentCategory: parentCategory
      ? {
          _id: parentCategory._id,
          slug: parentCategory.slug,
          nameFr: parentCategory.nameFr,
          nameAr: parentCategory.nameAr,
        }
      : null,
  };
}

export function buildProductSearchText(
  p: Pick<Doc<"products">, "nameFr" | "nameAr" | "sku" | "barcode" | "shortDescriptionFr">,
  brandName?: string,
  categoryNames?: string[],
) {
  return [
    p.nameFr,
    p.nameAr,
    p.sku,
    p.barcode ?? "",
    brandName ?? "",
    ...(categoryNames ?? []),
    p.shortDescriptionFr ?? "",
  ]
    .join(" ")
    .slice(0, 2000);
}

/** Loads brands referenced by a list of products in one pass. */
export async function loadBrands(ctx: QueryCtx, products: Doc<"products">[]) {
  const ids = Array.from(
    new Set(products.map((p) => p.brandId).filter((x): x is Id<"brands"> => !!x)),
  );
  const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
  const map = new Map<string, BrandLite>();
  for (const b of docs) if (b) map.set(b._id, { _id: b._id, name: b.name, slug: b.slug });
  return map;
}

export async function toCards(ctx: QueryCtx, products: Doc<"products">[]) {
  const brands = await loadBrands(ctx, products);
  return products.map((p) => toProductCard(p, p.brandId ? brands.get(p.brandId) : null));
}

/** Category id plus all active descendant ids. */
export async function categoryTreeIds(ctx: QueryCtx, rootId: Id<"categories">) {
  const result: Id<"categories">[] = [rootId];
  const queue: Id<"categories">[] = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    const children = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentId", id))
      .collect();
    for (const c of children) {
      if (!c.isActive) continue;
      result.push(c._id);
      queue.push(c._id);
    }
  }
  return result;
}

export type SortKey = "newest" | "price_asc" | "price_desc" | "popular" | "discount";

export function sortProducts(list: Doc<"products">[], sort: SortKey) {
  const arr = [...list];
  switch (sort) {
    case "price_asc":
      return arr.sort((a, b) => a.price - b.price);
    case "price_desc":
      return arr.sort((a, b) => b.price - a.price);
    case "popular":
      return arr.sort((a, b) => b.salesCount - a.salesCount || b.viewCount - a.viewCount);
    case "discount": {
      const d = (p: Doc<"products">) =>
        p.oldPrice && p.oldPrice > p.price ? (p.oldPrice - p.price) / p.oldPrice : 0;
      return arr.sort((a, b) => d(b) - d(a));
    }
    default:
      return arr.sort((a, b) => b._creationTime - a._creationTime);
  }
}
