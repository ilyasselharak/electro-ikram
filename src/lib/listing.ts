export const SORTS = ["newest", "price_asc", "price_desc", "popular", "discount"] as const;
export type Sort = (typeof SORTS)[number];

export type ListingParams = {
  sort?: Sort;
  page: number;
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function parseListingParams(sp: RawParams): ListingParams {
  const sort = first(sp.sort) as Sort | undefined;
  const page = Math.max(1, Math.floor(Number(first(sp.page)) || 1));
  const brands = (first(sp.brands) ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  return {
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page,
    brands,
    minPrice: num(first(sp.min)),
    maxPrice: num(first(sp.max)),
    inStock: first(sp.stock) === "1",
  };
}

/** True when the listing is filtered (filtered views are noindex to avoid duplicate content). */
export function isFiltered(p: ListingParams) {
  return p.brands.length > 0 || p.minPrice !== undefined || p.maxPrice !== undefined || p.inStock || !!p.sort;
}

export function toSearchString(p: Partial<ListingParams> & { q?: string }) {
  const s = new URLSearchParams();
  if (p.q) s.set("q", p.q);
  if (p.sort) s.set("sort", p.sort);
  if (p.brands?.length) s.set("brands", p.brands.join(","));
  if (p.minPrice !== undefined) s.set("min", String(p.minPrice));
  if (p.maxPrice !== undefined) s.set("max", String(p.maxPrice));
  if (p.inStock) s.set("stock", "1");
  if (p.page && p.page > 1) s.set("page", String(p.page));
  const str = s.toString();
  return str ? `?${str}` : "";
}
