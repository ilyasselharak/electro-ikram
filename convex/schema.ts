import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import {
  vBannerPlacement,
  vCouponType,
  vImage,
  vOrderStatus,
  vProductStatus,
  vRole,
  vSectionItem,
  vSectionType,
  vSeo,
  vSpec,
} from "./lib/validators";

export default defineSchema({
  ...authTables,

  // Extends the Convex Auth users table with admin roles.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(vRole),
    isActive: v.optional(v.boolean()),
    lastLoginAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"]),

  categories: defineTable({
    nameFr: v.string(),
    nameAr: v.string(),
    slug: v.string(),
    descriptionFr: v.optional(v.string()),
    descriptionAr: v.optional(v.string()),
    image: v.optional(vImage),
    banner: v.optional(vImage),
    icon: v.optional(v.string()),
    parentId: v.optional(v.id("categories")),
    order: v.number(),
    isActive: v.boolean(),
    showInMenu: v.optional(v.boolean()),
    seo: v.optional(vSeo),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentId", "order"])
    .index("by_order", ["order"]),

  brands: defineTable({
    name: v.string(),
    slug: v.string(),
    logo: v.optional(vImage),
    descriptionFr: v.optional(v.string()),
    descriptionAr: v.optional(v.string()),
    website: v.optional(v.string()),
    isActive: v.boolean(),
    isFeatured: v.boolean(),
    order: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"]),

  products: defineTable({
    nameFr: v.string(),
    nameAr: v.string(),
    slug: v.string(),
    descriptionFr: v.string(),
    descriptionAr: v.string(),
    shortDescriptionFr: v.optional(v.string()),
    shortDescriptionAr: v.optional(v.string()),
    brandId: v.optional(v.id("brands")),
    categoryId: v.id("categories"),
    sku: v.string(),
    barcode: v.optional(v.string()),
    // Admin-only. Never returned by public queries.
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
    salesCount: v.number(),
    viewCount: v.number(),
    searchText: v.string(),
    // Electro Darna product id this product was cloned from (stock synced from it).
    sourceId: v.optional(v.string()),
    sourceSyncedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_sku", ["sku"])
    .index("by_source", ["sourceId"])
    .index("by_status", ["status"])
    .index("by_category_status", ["categoryId", "status"])
    .index("by_brand_status", ["brandId", "status"])
    .index("by_status_featured", ["status", "isFeatured"])
    .index("by_status_bestseller", ["status", "isBestSeller"])
    .index("by_status_sales", ["status", "salesCount"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["status", "categoryId", "brandId"],
    }),

  // Old slugs kept after a rename so we can 301 to the new URL.
  slugRedirects: defineTable({
    entity: v.union(v.literal("product"), v.literal("category")),
    fromSlug: v.string(),
    toSlug: v.string(),
  }).index("by_entity_from", ["entity", "fromSlug"]),

  customers: defineTable({
    fullName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
    isBlocked: v.boolean(),
    totalOrders: v.number(),
    totalSpent: v.number(),
    lastOrderAt: v.optional(v.number()),
    searchText: v.string(),
  })
    .index("by_phone", ["phone"])
    .index("by_last_order", ["lastOrderAt"])
    .searchIndex("search_text", { searchField: "searchText" }),

  orders: defineTable({
    orderNumber: v.string(),
    accessToken: v.string(),
    customerId: v.id("customers"),
    customer: v.object({
      fullName: v.string(),
      phone: v.string(),
      city: v.string(),
      address: v.string(),
      email: v.optional(v.string()),
    }),
    notes: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        nameFr: v.string(),
        nameAr: v.string(),
        slug: v.string(),
        sku: v.string(),
        image: v.optional(vImage),
        price: v.number(),
        quantity: v.number(),
        lineTotal: v.number(),
      }),
    ),
    subtotal: v.number(),
    discount: v.number(),
    couponCode: v.optional(v.string()),
    deliveryFee: v.number(),
    total: v.number(),
    paymentMethod: v.literal("cod"),
    status: vOrderStatus,
    stockRestored: v.optional(v.boolean()),
    internalNotes: v.optional(v.string()),
    locale: v.union(v.literal("fr"), v.literal("ar")),
    searchText: v.string(),
    updatedAt: v.number(),
  })
    .index("by_number", ["orderNumber"])
    .index("by_status", ["status"])
    .index("by_customer", ["customerId"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["status"],
    }),

  orderStatusHistory: defineTable({
    orderId: v.id("orders"),
    status: vOrderStatus,
    note: v.optional(v.string()),
    changedBy: v.optional(v.id("users")),
  }).index("by_order", ["orderId"]),

  coupons: defineTable({
    code: v.string(),
    descriptionFr: v.optional(v.string()),
    type: vCouponType,
    value: v.number(),
    minOrderAmount: v.optional(v.number()),
    maxDiscount: v.optional(v.number()),
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    usageLimit: v.optional(v.number()),
    usageCount: v.number(),
    isActive: v.boolean(),
  }).index("by_code", ["code"]),

  banners: defineTable({
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
    order: v.number(),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  }).index("by_placement", ["placement", "order"]),

  homepageSections: defineTable({
    type: vSectionType,
    titleFr: v.optional(v.string()),
    titleAr: v.optional(v.string()),
    subtitleFr: v.optional(v.string()),
    subtitleAr: v.optional(v.string()),
    isEnabled: v.boolean(),
    order: v.number(),
    limit: v.optional(v.number()),
    productIds: v.optional(v.array(v.id("products"))),
    categoryIds: v.optional(v.array(v.id("categories"))),
    brandIds: v.optional(v.array(v.id("brands"))),
    items: v.optional(v.array(vSectionItem)),
  }).index("by_order", ["order"]),

  storeSettings: defineTable({
    key: v.literal("main"),
    storeName: v.string(),
    logo: v.optional(vImage),
    favicon: v.optional(vImage),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
    addressFr: v.optional(v.string()),
    addressAr: v.optional(v.string()),
    city: v.optional(v.string()),
    social: v.object({
      facebook: v.optional(v.string()),
      instagram: v.optional(v.string()),
      tiktok: v.optional(v.string()),
      youtube: v.optional(v.string()),
      x: v.optional(v.string()),
    }),
    currency: v.string(),
    defaultLanguage: v.union(v.literal("fr"), v.literal("ar")),
    availableLanguages: v.array(v.union(v.literal("fr"), v.literal("ar"))),
    deliveryFee: v.number(),
    freeDeliveryThreshold: v.optional(v.number()),
    minOrderAmount: v.optional(v.number()),
    deliveryDelayFr: v.optional(v.string()),
    deliveryDelayAr: v.optional(v.string()),
    announcement: v.object({
      enabled: v.boolean(),
      textFr: v.optional(v.string()),
      textAr: v.optional(v.string()),
      link: v.optional(v.string()),
    }),
    businessHoursFr: v.optional(v.string()),
    businessHoursAr: v.optional(v.string()),
    notifyEmail: v.optional(v.string()),
    seo: v.object({
      siteTitleFr: v.optional(v.string()),
      siteTitleAr: v.optional(v.string()),
      siteDescriptionFr: v.optional(v.string()),
      siteDescriptionAr: v.optional(v.string()),
      keywords: v.optional(v.array(v.string())),
      ogImage: v.optional(vImage),
      canonicalBase: v.optional(v.string()),
      robotsIndex: v.boolean(),
      robotsFollow: v.boolean(),
      twitterHandle: v.optional(v.string()),
    }),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  contactMessages: defineTable({
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
    isRead: v.boolean(),
  }),

  newsletterSubscribers: defineTable({
    email: v.string(),
    locale: v.union(v.literal("fr"), v.literal("ar")),
  }).index("by_email", ["email"]),

  productViews: defineTable({
    productId: v.id("products"),
    day: v.string(),
    count: v.number(),
  })
    .index("by_product_day", ["productId", "day"])
    .index("by_day", ["day"]),

  adminNotifications: defineTable({
    kind: v.union(v.literal("order"), v.literal("message"), v.literal("stock")),
    title: v.string(),
    body: v.optional(v.string()),
    link: v.optional(v.string()),
    isRead: v.boolean(),
  }).index("by_read", ["isRead"]),

  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),
});
