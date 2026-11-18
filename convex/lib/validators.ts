import { v, type Infer } from "convex/values";

export const ROLES = ["owner", "admin", "editor"] as const;
export const vRole = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("editor"),
);
export type Role = Infer<typeof vRole>;

export const vImage = v.object({
  publicId: v.string(),
  url: v.string(),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  alt: v.optional(v.string()),
});
export type ImageAsset = Infer<typeof vImage>;

export const vSeo = v.object({
  titleFr: v.optional(v.string()),
  titleAr: v.optional(v.string()),
  descriptionFr: v.optional(v.string()),
  descriptionAr: v.optional(v.string()),
  focusKeyword: v.optional(v.string()),
  keywords: v.optional(v.array(v.string())),
  canonicalUrl: v.optional(v.string()),
  ogTitle: v.optional(v.string()),
  ogDescription: v.optional(v.string()),
  ogImage: v.optional(vImage),
  noindex: v.optional(v.boolean()),
  nofollow: v.optional(v.boolean()),
});
export type Seo = Infer<typeof vSeo>;

export const vSpec = v.object({
  labelFr: v.string(),
  labelAr: v.string(),
  valueFr: v.string(),
  valueAr: v.string(),
});

export const PRODUCT_STATUSES = ["published", "draft", "archived"] as const;
export const vProductStatus = v.union(
  v.literal("published"),
  v.literal("draft"),
  v.literal("archived"),
);

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;
export const vOrderStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("processing"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("cancelled"),
  v.literal("returned"),
);
export type OrderStatus = Infer<typeof vOrderStatus>;

export const vCouponType = v.union(v.literal("percentage"), v.literal("fixed"));

export const vBannerPlacement = v.union(
  v.literal("hero"),
  v.literal("promo"),
);

export const SECTION_TYPES = [
  "hero",
  "categories",
  "best_sellers",
  "new_arrivals",
  "offers",
  "featured_products",
  "promo_banners",
  "brands",
  "why_us",
  "testimonials",
  "newsletter",
] as const;
export const vSectionType = v.union(
  v.literal("hero"),
  v.literal("categories"),
  v.literal("best_sellers"),
  v.literal("new_arrivals"),
  v.literal("offers"),
  v.literal("featured_products"),
  v.literal("promo_banners"),
  v.literal("brands"),
  v.literal("why_us"),
  v.literal("testimonials"),
  v.literal("newsletter"),
);
export type SectionType = Infer<typeof vSectionType>;

export const vSectionItem = v.object({
  icon: v.optional(v.string()),
  titleFr: v.optional(v.string()),
  titleAr: v.optional(v.string()),
  textFr: v.optional(v.string()),
  textAr: v.optional(v.string()),
  author: v.optional(v.string()),
  city: v.optional(v.string()),
});

export const vLocale = v.union(v.literal("fr"), v.literal("ar"));

/** A delivery address saved on a customer account. */
export const vAddress = v.object({
  id: v.string(),
  label: v.optional(v.string()),
  fullName: v.string(),
  phone: v.string(),
  city: v.string(),
  address: v.string(),
  isDefault: v.boolean(),
});
export type SavedAddress = Infer<typeof vAddress>;

export const STOCK_REASONS = ["initial", "sale", "cancel", "reactivate", "adjust", "restock", "loss", "import", "sync"] as const;
export const vStockReason = v.union(
  v.literal("initial"),
  v.literal("sale"),
  v.literal("cancel"),
  v.literal("reactivate"),
  v.literal("adjust"),
  v.literal("restock"),
  v.literal("loss"),
  v.literal("import"),
  v.literal("sync"),
);
export type StockReason = Infer<typeof vStockReason>;

/** Storefront design (see convex/lib/theme.ts for presets and defaults). */
export const vTheme = v.object({
  primary: v.string(),
  dark: v.string(),
  sale: v.string(),
  radius: v.number(),
  font: v.union(v.literal("manrope"), v.literal("inter"), v.literal("poppins"), v.literal("dm-sans")),
  cardStyle: v.union(v.literal("bordered"), v.literal("elevated"), v.literal("minimal")),
  headerStyle: v.union(v.literal("light"), v.literal("dark")),
});
export type Theme = Infer<typeof vTheme>;
