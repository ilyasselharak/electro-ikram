import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { requirePermission } from "./lib/permissions";
import { vLocale, vOrderStatus, type OrderStatus } from "./lib/validators";
import {
  clean,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  rateLimit,
  requireText,
  roundMoney,
} from "./lib/utils";
import { computeDeliveryFee, loadSettings } from "./lib/settings";
import { evaluateCoupon, findCoupon } from "./coupons";

const MAX_QTY_PER_LINE = 20;
const MAX_LINES = 30;
const INACTIVE: OrderStatus[] = ["cancelled", "returned"];

function randomToken(length = 32) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function generateOrderNumber(ctx: MutationCtx) {
  const d = new Date();
  const datePart = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  for (let i = 0; i < 20; i++) {
    const bytes = new Uint8Array(3);
    crypto.getRandomValues(bytes);
    const rand = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 100000;
    const candidate = `EI-${datePart}-${String(rand).padStart(5, "0")}`;
    const exists = await ctx.db
      .query("orders")
      .withIndex("by_number", (q) => q.eq("orderNumber", candidate))
      .first();
    if (!exists) return candidate;
  }
  throw new ConvexError("Impossible de générer un numéro de commande.");
}

/** Public projection of an order — no internal notes, no customer id. */
function toPublicOrder(o: Doc<"orders">, history: Doc<"orderStatusHistory">[]) {
  return {
    orderNumber: o.orderNumber,
    createdAt: o._creationTime,
    status: o.status,
    customer: o.customer,
    notes: o.notes,
    items: o.items.map((i) => ({
      nameFr: i.nameFr,
      nameAr: i.nameAr,
      slug: i.slug,
      sku: i.sku,
      image: i.image ?? null,
      price: i.price,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    subtotal: o.subtotal,
    discount: o.discount,
    couponCode: o.couponCode,
    deliveryFee: o.deliveryFee,
    total: o.total,
    paymentMethod: o.paymentMethod,
    history: history.map((h) => ({ status: h.status, at: h._creationTime })),
  };
}

/* -------------------------------------------------------------------------- */
/*                               Public checkout                              */
/* -------------------------------------------------------------------------- */

export const create = mutation({
  args: {
    customer: v.object({
      fullName: v.string(),
      phone: v.string(),
      city: v.string(),
      address: v.string(),
      email: v.optional(v.string()),
    }),
    notes: v.optional(v.string()),
    items: v.array(v.object({ productId: v.string(), quantity: v.number() })),
    couponCode: v.optional(v.string()),
    locale: vLocale,
  },
  handler: async (ctx, args) => {
    // 1. Validate customer data.
    const fullName = requireText(args.customer.fullName, "fullName", 120);
    const phone = normalizePhone(args.customer.phone);
    if (!isValidPhone(phone)) throw new ConvexError({ code: "INVALID_PHONE", message: "Numéro de téléphone invalide." });
    const city = requireText(args.customer.city, "city", 80);
    const address = requireText(args.customer.address, "address", 400);
    const email = clean(args.customer.email)?.toLowerCase();
    if (email && !isValidEmail(email)) throw new ConvexError({ code: "INVALID_EMAIL", message: "E-mail invalide." });
    const notes = clean(args.notes)?.slice(0, 1000);

    await rateLimit(ctx, `order:${phone}`, 5, 60 * 60 * 1000);

    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    if (existingCustomer?.isBlocked) {
      throw new ConvexError({ code: "BLOCKED", message: "Impossible de passer commande. Contactez-nous." });
    }

    // 2. Merge duplicate lines and validate quantities.
    const merged = new Map<Id<"products">, number>();
    for (const item of args.items) {
      const id = ctx.db.normalizeId("products", item.productId);
      if (!id) throw new ConvexError({ code: "INVALID_ITEM", message: "Produit invalide." });
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new ConvexError({ code: "INVALID_QTY", message: "Quantité invalide." });
      }
      merged.set(id, (merged.get(id) ?? 0) + item.quantity);
    }
    if (merged.size === 0) throw new ConvexError({ code: "EMPTY_CART", message: "Votre panier est vide." });
    if (merged.size > MAX_LINES) throw new ConvexError({ code: "INVALID_QTY", message: "Trop d'articles." });

    // 3. Check stock and price every line from the database (never trust client prices).
    const lines: Doc<"orders">["items"] = [];
    const products: Doc<"products">[] = [];
    for (const [productId, quantity] of merged) {
      if (quantity > MAX_QTY_PER_LINE) {
        throw new ConvexError({ code: "INVALID_QTY", message: `Quantité maximale : ${MAX_QTY_PER_LINE}.`, productId });
      }
      const p = await ctx.db.get(productId);
      if (!p || p.status !== "published") {
        throw new ConvexError({ code: "UNAVAILABLE", message: "Un produit n'est plus disponible.", productId });
      }
      if (p.stock < quantity) {
        throw new ConvexError({
          code: "OUT_OF_STOCK",
          message: `Stock insuffisant pour « ${p.nameFr} » (disponible : ${Math.max(0, p.stock)}).`,
          productId,
          available: Math.max(0, p.stock),
        });
      }
      products.push(p);
      lines.push({
        productId,
        nameFr: p.nameFr,
        nameAr: p.nameAr,
        slug: p.slug,
        sku: p.sku,
        image: p.images[0],
        price: p.price,
        quantity,
        lineTotal: roundMoney(p.price * quantity),
      });
    }

    const subtotal = roundMoney(lines.reduce((s, l) => s + l.lineTotal, 0));
    const settings = await loadSettings(ctx);
    if (settings.minOrderAmount && subtotal < settings.minOrderAmount) {
      throw new ConvexError({
        code: "MIN_ORDER",
        message: `Montant minimum de commande : ${settings.minOrderAmount} DH.`,
        minOrderAmount: settings.minOrderAmount,
      });
    }

    // 4. Coupon (validated server-side).
    let discount = 0;
    let couponCode: string | undefined;
    if (args.couponCode?.trim()) {
      const coupon = await findCoupon(ctx, args.couponCode);
      const result = evaluateCoupon(coupon, subtotal);
      if (!result.ok) {
        throw new ConvexError({ code: "COUPON_INVALID", message: "Code promo invalide.", reason: result.reason });
      }
      discount = result.discount;
      couponCode = coupon!.code;
      await ctx.db.patch(coupon!._id, { usageCount: coupon!.usageCount + 1 });
    }

    const afterDiscount = roundMoney(subtotal - discount);
    const deliveryFee = computeDeliveryFee(settings, afterDiscount);
    const total = roundMoney(afterDiscount + deliveryFee);

    // 5. Decrement stock atomically (Convex mutations are serializable transactions).
    for (const p of products) {
      const qty = merged.get(p._id)!;
      const newStock = p.stock - qty;
      await ctx.db.patch(p._id, { stock: newStock, salesCount: p.salesCount + qty });
      if (newStock <= p.minStockAlert && p.stock > p.minStockAlert) {
        await ctx.db.insert("adminNotifications", {
          kind: "stock",
          title: newStock <= 0 ? `Rupture de stock : ${p.nameFr}` : `Stock faible : ${p.nameFr} (${newStock})`,
          link: `/admin/products/${p._id}`,
          isRead: false,
        });
      }
    }

    // 6. Customer record.
    let customerId: Id<"customers">;
    const searchText = `${fullName} ${phone} ${email ?? ""} ${city}`;
    if (existingCustomer) {
      customerId = existingCustomer._id;
      await ctx.db.patch(customerId, {
        fullName,
        email: email ?? existingCustomer.email,
        city,
        address,
        totalOrders: existingCustomer.totalOrders + 1,
        totalSpent: roundMoney(existingCustomer.totalSpent + total),
        lastOrderAt: Date.now(),
        searchText,
      });
    } else {
      customerId = await ctx.db.insert("customers", {
        fullName,
        phone,
        email,
        city,
        address,
        isBlocked: false,
        totalOrders: 1,
        totalSpent: total,
        lastOrderAt: Date.now(),
        searchText,
      });
    }

    // 7. Order + history + admin notification.
    const orderNumber = await generateOrderNumber(ctx);
    const accessToken = randomToken();
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      accessToken,
      customerId,
      customer: { fullName, phone, city, address, email },
      notes,
      items: lines,
      subtotal,
      discount,
      couponCode,
      deliveryFee,
      total,
      paymentMethod: "cod",
      status: "pending",
      locale: args.locale,
      searchText: `${orderNumber} ${fullName} ${phone} ${city}`,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("orderStatusHistory", { orderId, status: "pending" });
    await ctx.db.insert("adminNotifications", {
      kind: "order",
      title: `Nouvelle commande ${orderNumber}`,
      body: `${fullName} · ${city} · ${total} DH`,
      link: `/admin/orders/${orderId}`,
      isRead: false,
    });
    await ctx.scheduler.runAfter(0, internal.notifications.emailNewOrder, { orderId });

    return { orderNumber, accessToken };
  },
});

/** Order confirmation page: requires the secret token returned at checkout. */
export const getConfirmation = query({
  args: { orderNumber: v.string(), token: v.string() },
  handler: async (ctx, { orderNumber, token }) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_number", (q) => q.eq("orderNumber", orderNumber.trim().toUpperCase()))
      .unique();
    if (!order || order.accessToken !== token) return null;
    const history = await ctx.db
      .query("orderStatusHistory")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();
    return toPublicOrder(order, history);
  },
});

/** Order tracking: order number + the phone number used at checkout. */
export const track = query({
  args: { orderNumber: v.string(), phone: v.string() },
  handler: async (ctx, { orderNumber, phone }) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_number", (q) => q.eq("orderNumber", orderNumber.trim().toUpperCase()))
      .unique();
    if (!order || order.customer.phone !== normalizePhone(phone)) return null;
    const history = await ctx.db
      .query("orderStatusHistory")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();
    const pub = toPublicOrder(order, history);
    // Mask address details on the tracking page.
    return { ...pub, customer: { fullName: pub.customer.fullName, city: pub.customer.city } };
  },
});

/* -------------------------------------------------------------------------- */
/*                                    Admin                                   */
/* -------------------------------------------------------------------------- */

export const adminList = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(vOrderStatus),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, status, search }) => {
    await requirePermission(ctx, "orders");
    const term = search?.trim();
    if (term) {
      return ctx.db
        .query("orders")
        .withSearchIndex("search_text", (q) => {
          const b = q.search("searchText", term);
          return status ? b.eq("status", status) : b;
        })
        .paginate(paginationOpts);
    }
    if (status) {
      return ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .paginate(paginationOpts);
    }
    return ctx.db.query("orders").order("desc").paginate(paginationOpts);
  },
});

export const statusCounts = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "orders");
    const counts: Record<string, number> = {};
    for (const s of ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"] as const) {
      counts[s] = (await ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", s)).collect()).length;
    }
    return counts;
  },
});

export const adminGet = query({
  args: { id: v.id("orders") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "orders");
    const order = await ctx.db.get(id);
    if (!order) return null;
    const history = await ctx.db
      .query("orderStatusHistory")
      .withIndex("by_order", (q) => q.eq("orderId", id))
      .collect();
    const withUsers = await Promise.all(
      history.map(async (h) => {
        const user = h.changedBy ? await ctx.db.get(h.changedBy) : null;
        return { ...h, changedByName: user?.name ?? user?.email ?? null };
      }),
    );
    const customer = await ctx.db.get(order.customerId);
    return { order, history: withUsers, customer };
  },
});

async function restock(ctx: MutationCtx, order: Doc<"orders">, direction: 1 | -1) {
  for (const item of order.items) {
    const p = await ctx.db.get(item.productId);
    if (!p) continue;
    if (direction === -1 && p.stock < item.quantity) {
      throw new ConvexError({
        code: "OUT_OF_STOCK",
        message: `Stock insuffisant pour réactiver la commande : « ${p.nameFr} » (disponible : ${p.stock}).`,
      });
    }
    await ctx.db.patch(p._id, {
      stock: p.stock + direction * item.quantity,
      salesCount: Math.max(0, p.salesCount - direction * item.quantity),
    });
  }
}

export const updateStatus = mutation({
  args: { id: v.id("orders"), status: vOrderStatus, note: v.optional(v.string()) },
  handler: async (ctx, { id, status, note }) => {
    const user = await requirePermission(ctx, "orders");
    const order = await ctx.db.get(id);
    if (!order) throw new ConvexError({ code: "NOT_FOUND", message: "Commande introuvable." });
    if (order.status === status) return;

    const wasInactive = INACTIVE.includes(order.status);
    const willBeInactive = INACTIVE.includes(status);
    let stockRestored = order.stockRestored ?? false;
    const customer = await ctx.db.get(order.customerId);

    if (!wasInactive && willBeInactive && !stockRestored) {
      await restock(ctx, order, 1);
      stockRestored = true;
      if (customer) {
        await ctx.db.patch(customer._id, {
          totalOrders: Math.max(0, customer.totalOrders - 1),
          totalSpent: roundMoney(Math.max(0, customer.totalSpent - order.total)),
        });
      }
    } else if (wasInactive && !willBeInactive && stockRestored) {
      await restock(ctx, order, -1);
      stockRestored = false;
      if (customer) {
        await ctx.db.patch(customer._id, {
          totalOrders: customer.totalOrders + 1,
          totalSpent: roundMoney(customer.totalSpent + order.total),
        });
      }
    }

    await ctx.db.patch(id, { status, stockRestored, updatedAt: Date.now() });
    await ctx.db.insert("orderStatusHistory", {
      orderId: id,
      status,
      note: clean(note),
      changedBy: user._id,
    });
  },
});

export const updateInternalNotes = mutation({
  args: { id: v.id("orders"), internalNotes: v.string() },
  handler: async (ctx, { id, internalNotes }) => {
    await requirePermission(ctx, "orders");
    await ctx.db.patch(id, { internalNotes: internalNotes.slice(0, 5000), updatedAt: Date.now() });
  },
});

export const updateCustomerInfo = mutation({
  args: {
    id: v.id("orders"),
    customer: v.object({
      fullName: v.string(),
      phone: v.string(),
      city: v.string(),
      address: v.string(),
      email: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { id, customer }) => {
    await requirePermission(ctx, "orders");
    const order = await ctx.db.get(id);
    if (!order) throw new ConvexError({ code: "NOT_FOUND", message: "Commande introuvable." });
    const phone = normalizePhone(customer.phone);
    if (!isValidPhone(phone)) throw new ConvexError({ code: "INVALID_PHONE", message: "Numéro de téléphone invalide." });
    const email = clean(customer.email)?.toLowerCase();
    if (email && !isValidEmail(email)) throw new ConvexError({ code: "INVALID_EMAIL", message: "E-mail invalide." });
    const data = {
      fullName: requireText(customer.fullName, "Nom", 120),
      phone,
      city: requireText(customer.city, "Ville", 80),
      address: requireText(customer.address, "Adresse", 400),
      email,
    };
    await ctx.db.patch(id, {
      customer: data,
      searchText: `${order.orderNumber} ${data.fullName} ${data.phone} ${data.city}`,
      updatedAt: Date.now(),
    });
  },
});

/** Rows for CSV export within a date range (max 5000). */
export const exportRows = query({
  args: { from: v.number(), to: v.number(), status: v.optional(vOrderStatus) },
  handler: async (ctx, { from, to, status }) => {
    await requirePermission(ctx, "orders");
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", from).lte("_creationTime", to))
      .order("desc")
      .take(5000);
    return rows
      .filter((o) => !status || o.status === status)
      .map((o) => ({
        orderNumber: o.orderNumber,
        date: o._creationTime,
        status: o.status,
        fullName: o.customer.fullName,
        phone: o.customer.phone,
        city: o.customer.city,
        address: o.customer.address,
        email: o.customer.email ?? "",
        items: o.items.map((i) => `${i.quantity}x ${i.sku}`).join(" | "),
        subtotal: o.subtotal,
        discount: o.discount,
        couponCode: o.couponCode ?? "",
        deliveryFee: o.deliveryFee,
        total: o.total,
      }));
  },
});
