import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { unstable_cache } from "next/cache";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { env } from "./env";

export const STOREFRONT_TAG = "storefront";

function client() {
  return new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
}

/**
 * Runs a public Convex query through Next's data cache so storefront pages can
 * be statically regenerated. Admin saves call revalidateTag(STOREFRONT_TAG).
 */
function cachedQuery<Q extends FunctionReference<"query">>(query: Q, key: string, revalidate = 60) {
  return unstable_cache(
    async (args: FunctionArgs<Q>): Promise<FunctionReturnType<Q>> => client().query(query, args),
    ["convex", key],
    { revalidate, tags: [STOREFRONT_TAG] },
  );
}

export const getSettings = cachedQuery(api.settings.getPublic, "settings", 300);
export const getCategories = cachedQuery(api.categories.listPublic, "categories", 300);
export const getCategoryBySlug = cachedQuery(api.categories.getBySlug, "category");
export const getBrands = cachedQuery(api.brands.listPublic, "brands", 300);
export const getBrandBySlug = cachedQuery(api.brands.getBySlug, "brand");
export const getHomepage = cachedQuery(api.homepage.getPublic, "homepage");
export const getProductBySlug = cachedQuery(api.products.getBySlug, "product");
export const getRelated = cachedQuery(api.products.related, "related");
export const getListing = cachedQuery(api.products.listing, "listing");
export const getSitemapEntries = cachedQuery(api.products.sitemapEntries, "sitemap", 600);
