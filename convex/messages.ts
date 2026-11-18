import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./lib/permissions";
import { clean, isValidEmail, isValidPhone, normalizePhone, rateLimit, requireText } from "./lib/utils";

/* ----------------------------- Contact messages ----------------------------- */

export const sendContact = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const name = requireText(args.name, "name", 120);
    const email = clean(args.email)?.toLowerCase();
    const phone = args.phone ? normalizePhone(args.phone) : undefined;
    if (!email && !phone) throw new ConvexError({ code: "INVALID", message: "Téléphone ou e-mail requis." });
    if (email && !isValidEmail(email)) throw new ConvexError({ code: "INVALID_EMAIL", message: "E-mail invalide." });
    if (phone && !isValidPhone(phone)) throw new ConvexError({ code: "INVALID_PHONE", message: "Téléphone invalide." });
    await rateLimit(ctx, `contact:${email ?? phone}`, 3, 60 * 60 * 1000);
    await rateLimit(ctx, "contact:global", 120, 60 * 60 * 1000);
    await ctx.db.insert("contactMessages", {
      name,
      email,
      phone,
      subject: requireText(args.subject, "subject", 200),
      message: requireText(args.message, "message", 4000),
      isRead: false,
    });
    await ctx.db.insert("adminNotifications", {
      kind: "message",
      title: `Nouveau message de ${name}`,
      body: args.subject.slice(0, 120),
      link: "/admin/messages",
      isRead: false,
    });
  },
});

export const adminList = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requirePermission(ctx, "customers");
    return ctx.db.query("contactMessages").order("desc").paginate(paginationOpts);
  },
});

export const setRead = mutation({
  args: { id: v.id("contactMessages"), isRead: v.boolean() },
  handler: async (ctx, { id, isRead }) => {
    await requirePermission(ctx, "customers");
    await ctx.db.patch(id, { isRead });
  },
});

export const remove = mutation({
  args: { id: v.id("contactMessages") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "customers");
    await ctx.db.delete(id);
  },
});

/* -------------------------------- Newsletter -------------------------------- */

export const subscribe = mutation({
  args: { email: v.string(), locale: v.union(v.literal("fr"), v.literal("ar")) },
  handler: async (ctx, { email, locale }) => {
    const normalized = email.trim().toLowerCase();
    if (!isValidEmail(normalized)) throw new ConvexError({ code: "INVALID_EMAIL", message: "E-mail invalide." });
    await rateLimit(ctx, "newsletter:global", 300, 60 * 60 * 1000);
    const existing = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (existing) return { alreadySubscribed: true };
    await ctx.db.insert("newsletterSubscribers", { email: normalized, locale });
    return { alreadySubscribed: false };
  },
});

export const subscribers = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "customers");
    return ctx.db.query("newsletterSubscribers").order("desc").take(5000);
  },
});

export const removeSubscriber = mutation({
  args: { id: v.id("newsletterSubscribers") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "customers");
    await ctx.db.delete(id);
  },
});
