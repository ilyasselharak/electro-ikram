import { v } from "convex/values";
import { internalAction, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getStaffUser } from "./lib/permissions";
import { loadSettings } from "./lib/settings";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getStaffUser(ctx);
    if (!user) return { items: [], unread: 0 };
    const unread = await ctx.db
      .query("adminNotifications")
      .withIndex("by_read", (q) => q.eq("isRead", false))
      .collect();
    const visible = user.role === "editor" ? unread.filter((n) => n.kind === "stock") : unread;
    const recent = await ctx.db.query("adminNotifications").order("desc").take(20);
    const items = user.role === "editor" ? recent.filter((n) => n.kind === "stock") : recent;
    return { items, unread: visible.length };
  },
});

export const markRead = mutation({
  args: { id: v.optional(v.id("adminNotifications")) },
  handler: async (ctx, { id }) => {
    const user = await getStaffUser(ctx);
    if (!user) return;
    if (id) {
      await ctx.db.patch(id, { isRead: true });
      return;
    }
    const unread = await ctx.db
      .query("adminNotifications")
      .withIndex("by_read", (q) => q.eq("isRead", false))
      .collect();
    for (const n of unread) await ctx.db.patch(n._id, { isRead: true });
  },
});

export const _orderForEmail = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    const settings = await loadSettings(ctx);
    return { order, notifyEmail: settings.notifyEmail ?? settings.email };
  },
});

/** Optional e-mail to the store owner on each new order (needs AUTH_RESEND_KEY). */
export const emailNewOrder = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) return;
    const { order, notifyEmail } = await ctx.runQuery(internal.notifications._orderForEmail, { orderId });
    if (!order || !notifyEmail) return;
    const site = process.env.SITE_URL ?? "";
    const lines = order.items.map((i) => `• ${i.quantity} × ${i.nameFr} (${i.sku}) — ${i.lineTotal} DH`).join("\n");
    const text = [
      `Nouvelle commande ${order.orderNumber}`,
      ``,
      `Client : ${order.customer.fullName}`,
      `Téléphone : ${order.customer.phone}`,
      `Ville : ${order.customer.city}`,
      `Adresse : ${order.customer.address}`,
      ``,
      lines,
      ``,
      `Total : ${order.total} DH (paiement à la livraison)`,
      site ? `\n${site}/admin/orders/${order._id}` : "",
    ].join("\n");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL_FROM ?? "Electro-Ikram <onboarding@resend.dev>",
        to: [notifyEmail],
        subject: `🛒 Nouvelle commande ${order.orderNumber} — ${order.total} DH`,
        text,
      }),
    });
    if (!res.ok) console.error("Order e-mail failed", await res.text());
  },
});
