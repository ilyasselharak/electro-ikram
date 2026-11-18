import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { ImageAsset } from "./validators";

/** Deletes from Cloudinary any image present in `before` but absent from `after`. */
export async function cleanupReplacedImages(
  ctx: MutationCtx,
  before: (ImageAsset | undefined | null)[],
  after: (ImageAsset | undefined | null)[],
) {
  const keep = new Set(after.filter(Boolean).map((i) => i!.publicId));
  const removed = before
    .filter(Boolean)
    .map((i) => i!.publicId)
    .filter((id) => !keep.has(id));
  if (removed.length) {
    await ctx.scheduler.runAfter(0, internal.cloudinary.destroyMany, { publicIds: removed });
  }
}
