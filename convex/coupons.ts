import { v, ConvexError } from "convex/values";
import { query, mutation, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requirePermission } from "./lib/permissions";
import { vCouponType } from "./lib/validators";
import { clean, roundMoney } from "./lib/utils";

export type CouponReason =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "limit_reached"
  | "min_amount";

export function evaluateCoupon(
  coupon: Doc<"coupons"> | null,
  subtotal: number,
  now = Date.now(),
): { ok: true; discount: number } | { ok: false; reason: CouponReason; minOrderAmount?: number } {
  if (!coupon) return { ok: false, reason: "not_found" };
  if (!coupon.isActive) return { ok: false, reason: "inactive" };
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, reason: "not_started" };
  if (coupon.expiresAt && now > coupon.expiresAt) return { ok: false, reason: "expired" };
  if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit)
    return { ok: false, reason: "limit_reached" };
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount)
    return { ok: false, reason: "min_amount", minOrderAmount: coupon.minOrderAmount };
  let discount =
    coupon.type === "percentage" ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.maxDiscount !== undefined && coupon.maxDiscount > 0)
    discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);
  return { ok: true, discount: roundMoney(discount) };
}

export async function findCoupon(ctx: QueryCtx, code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  return ctx.db
    .query("coupons")
    .withIndex("by_code", (q) => q.eq("code", normalized))
    .unique();
}

/** Advisory check for the cart UI. `orders.create` re-validates on the server. */
export const check = query({
  args: { code: v.string(), subtotal: v.number() },
  handler: async (ctx, { code, subtotal }) => {
    const coupon = await findCoupon(ctx, code);
    const result = evaluateCoupon(coupon, subtotal);
    if (!result.ok) return { valid: false as const, reason: result.reason, minOrderAmount: result.minOrderAmount };
    return {
      valid: true as const,
      code: coupon!.code,
      discount: result.discount,
      type: coupon!.type,
      value: coupon!.value,
    };
  },
});

/* --------------------------------- Admin --------------------------------- */

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "coupons");
    return (await ctx.db.query("coupons").order("desc").collect());
  },
});

const couponInput = {
  code: v.string(),
  descriptionFr: v.optional(v.string()),
  type: vCouponType,
  value: v.number(),
  minOrderAmount: v.optional(v.number()),
  maxDiscount: v.optional(v.number()),
  startsAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
  usageLimit: v.optional(v.number()),
  isActive: v.boolean(),
};

function validate(args: { code: string; type: "percentage" | "fixed"; value: number; startsAt?: number; expiresAt?: number }) {
  const code = args.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    throw new ConvexError({ code: "INVALID", message: "Code invalide (3 à 32 caractères : lettres, chiffres, - ou _)." });
  }
  if (!(args.value > 0)) throw new ConvexError({ code: "INVALID", message: "La valeur doit être positive." });
  if (args.type === "percentage" && args.value > 100)
    throw new ConvexError({ code: "INVALID", message: "Un pourcentage ne peut pas dépasser 100." });
  if (args.startsAt && args.expiresAt && args.expiresAt <= args.startsAt)
    throw new ConvexError({ code: "INVALID", message: "La date d'expiration doit suivre la date de début." });
  return code;
}

export const create = mutation({
  args: couponInput,
  handler: async (ctx, args) => {
    await requirePermission(ctx, "coupons");
    const code = validate(args);
    if (await findCoupon(ctx, code)) throw new ConvexError({ code: "INVALID", message: "Ce code existe déjà." });
    return ctx.db.insert("coupons", { ...args, code, descriptionFr: clean(args.descriptionFr), usageCount: 0 });
  },
});

export const update = mutation({
  args: { id: v.id("coupons"), ...couponInput },
  handler: async (ctx, { id, ...args }) => {
    await requirePermission(ctx, "coupons");
    const code = validate(args);
    const dup = await findCoupon(ctx, code);
    if (dup && dup._id !== id) throw new ConvexError({ code: "INVALID", message: "Ce code existe déjà." });
    await ctx.db.patch(id, { ...args, code, descriptionFr: clean(args.descriptionFr) });
  },
});

export const toggle = mutation({
  args: { id: v.id("coupons"), isActive: v.boolean() },
  handler: async (ctx, { id, isActive }) => {
    await requirePermission(ctx, "coupons");
    await ctx.db.patch(id, { isActive });
  },
});

export const remove = mutation({
  args: { id: v.id("coupons") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "coupons");
    await ctx.db.delete(id);
  },
});
