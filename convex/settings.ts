import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requirePermission } from "./lib/permissions";
import { DEFAULT_SETTINGS, loadSettings } from "./lib/settings";
import { vImage } from "./lib/validators";
import { cleanupReplacedImages } from "./lib/images";

/** Public store settings. Internal fields (notification e-mail) are stripped. */
export const getPublic = query({
  args: {},
  handler: async (ctx) => {
    const s = await loadSettings(ctx);
    const { notifyEmail, ...rest } = s;
    void notifyEmail;
    return rest;
  },
});

export const adminGet = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "content");
    return loadSettings(ctx);
  },
});

const vLang = v.union(v.literal("fr"), v.literal("ar"));

export const update = mutation({
  args: {
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
    defaultLanguage: vLang,
    availableLanguages: v.array(vLang),
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
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "settings");
    if (args.deliveryFee < 0) throw new Error("Frais de livraison invalides.");
    const availableLanguages = args.availableLanguages.length ? args.availableLanguages : ["fr" as const];
    const existing = await ctx.db
      .query("storeSettings")
      .withIndex("by_key", (q) => q.eq("key", "main"))
      .unique();
    const data = { ...args, availableLanguages, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, data);
      await cleanupReplacedImages(ctx, [existing.logo, existing.favicon], [args.logo, args.favicon]);
    } else {
      await ctx.db.insert("storeSettings", { ...DEFAULT_SETTINGS, ...data, key: "main" });
    }
  },
});

export const updateSeo = mutation({
  args: {
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
  },
  handler: async (ctx, seo) => {
    await requirePermission(ctx, "content");
    const existing = await ctx.db
      .query("storeSettings")
      .withIndex("by_key", (q) => q.eq("key", "main"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { seo, updatedAt: Date.now() });
      await cleanupReplacedImages(ctx, [existing.seo.ogImage], [seo.ogImage]);
    } else {
      await ctx.db.insert("storeSettings", { ...DEFAULT_SETTINGS, seo, updatedAt: Date.now() });
    }
  },
});
