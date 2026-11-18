import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { StockReason } from "./validators";

/** Records a stock change for the inventory history. No-op when nothing moved. */
export async function logStock(
  ctx: MutationCtx,
  m: {
    productId: Id<"products">;
    delta: number;
    stockAfter: number;
    reason: StockReason;
    note?: string;
    orderId?: Id<"orders">;
    userId?: Id<"users">;
  },
) {
  if (m.delta === 0) return;
  await ctx.db.insert("stockMovements", m);
}
