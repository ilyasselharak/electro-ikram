import { v } from "convex/values";
import { query } from "./_generated/server";
import { requirePermission } from "./lib/permissions";
import { roundMoney } from "./lib/utils";

const vRange = v.union(v.literal("today"), v.literal("7d"), v.literal("30d"), v.literal("12m"));
const DAY = 24 * 60 * 60 * 1000;

/** Dashboard overview. `tzOffset` is the browser's getTimezoneOffset() in minutes. */
export const overview = query({
  args: { range: vRange, tzOffset: v.optional(v.number()) },
  handler: async (ctx, { range, tzOffset = 0 }) => {
    await requirePermission(ctx, "stats");
    const offsetMs = -tzOffset * 60 * 1000; // local = utc + offsetMs
    const now = Date.now();
    const localNow = new Date(now + offsetMs);
    const startOfToday =
      Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()) - offsetMs;

    let from: number;
    let buckets: { key: string; label: string; start: number; end: number }[] = [];
    if (range === "today") {
      from = startOfToday;
      for (let h = 0; h < 24; h += 2) {
        const start = from + h * 3600_000;
        buckets.push({ key: `h${h}`, label: `${String(h).padStart(2, "0")}h`, start, end: start + 2 * 3600_000 });
      }
    } else if (range === "12m") {
      const y = localNow.getUTCFullYear();
      const m = localNow.getUTCMonth();
      from = Date.UTC(y, m - 11, 1) - offsetMs;
      buckets = Array.from({ length: 12 }, (_, i) => {
        const start = Date.UTC(y, m - 11 + i, 1) - offsetMs;
        const end = Date.UTC(y, m - 10 + i, 1) - offsetMs;
        const d = new Date(start + offsetMs);
        return {
          key: `m${i}`,
          label: d.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }),
          start,
          end,
        };
      });
    } else {
      const days = range === "7d" ? 7 : 30;
      from = startOfToday - (days - 1) * DAY;
      buckets = Array.from({ length: days }, (_, i) => {
        const start = from + i * DAY;
        const d = new Date(start + offsetMs);
        return {
          key: `d${i}`,
          label: `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
          start,
          end: start + DAY,
        };
      });
    }

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", from))
      .collect();

    const statusCounts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    };
    let revenue = 0;
    let deliveredRevenue = 0;
    const productSales = new Map<string, { productId: string; nameFr: string; image: unknown; quantity: number; revenue: number }>();
    const series = buckets.map((b) => ({ label: b.label, revenue: 0, orders: 0 }));

    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
      const counted = o.status !== "cancelled" && o.status !== "returned";
      const idx = buckets.findIndex((b) => o._creationTime >= b.start && o._creationTime < b.end);
      if (idx >= 0) {
        series[idx].orders += 1;
        if (counted) series[idx].revenue = roundMoney(series[idx].revenue + o.total);
      }
      if (!counted) continue;
      revenue += o.total;
      if (o.status === "delivered") deliveredRevenue += o.total;
      for (const item of o.items) {
        const cur = productSales.get(item.productId) ?? {
          productId: item.productId,
          nameFr: item.nameFr,
          image: item.image ?? null,
          quantity: 0,
          revenue: 0,
        };
        cur.quantity += item.quantity;
        cur.revenue = roundMoney(cur.revenue + item.lineTotal);
        productSales.set(item.productId, cur);
      }
    }

    const products = await ctx.db.query("products").collect();
    const lowStock = products
      .filter((p) => p.status !== "archived" && p.stock <= p.minStockAlert)
      .sort((a, b) => a.stock - b.stock);
    const customers = await ctx.db.query("customers").collect();
    const newCustomers = customers.filter((c) => c._creationTime >= from).length;
    const recentOrders = await ctx.db.query("orders").order("desc").take(8);

    const counted = orders.filter((o) => o.status !== "cancelled" && o.status !== "returned");
    return {
      range,
      revenue: roundMoney(revenue),
      deliveredRevenue: roundMoney(deliveredRevenue),
      averageOrderValue: counted.length ? roundMoney(revenue / counted.length) : 0,
      totalOrders: orders.length,
      statusCounts,
      totalProducts: products.length,
      publishedProducts: products.filter((p) => p.status === "published").length,
      lowStockCount: lowStock.length,
      lowStock: lowStock.slice(0, 6).map((p) => ({
        _id: p._id,
        nameFr: p.nameFr,
        sku: p.sku,
        stock: p.stock,
        minStockAlert: p.minStockAlert,
        image: p.images[0] ?? null,
      })),
      totalCustomers: customers.length,
      newCustomers,
      series,
      bestSelling: [...productSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 6),
      recentOrders: recentOrders.map((o) => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        fullName: o.customer.fullName,
        city: o.customer.city,
        total: o.total,
        status: o.status,
        createdAt: o._creationTime,
      })),
    };
  },
});
