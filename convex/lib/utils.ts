import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";

/** Latin, URL-safe slug. Arabic-only input falls back to a short random suffix. */
export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || `item-${Math.random().toString(36).slice(2, 8)}`;
}

/** Normalises Moroccan phone numbers to the national 0XXXXXXXXX format. */
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s.\-()]/g, "");
  if (p.startsWith("+212")) p = "0" + p.slice(4);
  else if (p.startsWith("00212")) p = "0" + p.slice(5);
  else if (p.startsWith("212") && p.length === 12) p = "0" + p.slice(3);
  return p;
}

export function isValidPhone(phone: string) {
  return /^0[5-7]\d{8}$/.test(phone);
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function clean(s: string | undefined | null): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
}

export function requireText(value: string, field: string, max = 5000) {
  const t = value.trim();
  if (!t) throw new ConvexError({ code: "INVALID", message: `Champ requis : ${field}` });
  if (t.length > max) throw new ConvexError({ code: "INVALID", message: `Trop long : ${field}` });
  return t;
}

/**
 * Fixed-window rate limiter stored in the database.
 * Throws when `key` exceeds `max` hits within `windowMs`.
 */
export async function rateLimit(
  ctx: MutationCtx,
  key: string,
  max: number,
  windowMs: number,
) {
  const now = Date.now();
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!row || now - row.windowStart > windowMs) {
    if (row) await ctx.db.patch(row._id, { windowStart: now, count: 1 });
    else await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    return;
  }
  if (row.count >= max) {
    throw new ConvexError({
      code: "RATE_LIMITED",
      message: "Trop de tentatives. Veuillez réessayer plus tard.",
    });
  }
  await ctx.db.patch(row._id, { count: row.count + 1 });
}

export function dayKey(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}
