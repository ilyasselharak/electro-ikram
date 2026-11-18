import { v, ConvexError } from "convex/values";
import { action, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getStaffUser, roleCan } from "./lib/permissions";

const FOLDERS = ["products", "categories", "brands", "banners", "settings"] as const;
const vFolder = v.union(
  v.literal("products"),
  v.literal("categories"),
  v.literal("brands"),
  v.literal("banners"),
  v.literal("settings"),
);

function config() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret, root: process.env.CLOUDINARY_FOLDER ?? "electro-ikram" };
}

async function sha1Hex(input: string) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Cloudinary signature: sorted `key=value` pairs joined by `&`, then the secret. */
async function sign(params: Record<string, string | number>, secret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return sha1Hex(toSign + secret);
}

/** Server-side upload from a remote URL (Cloudinary fetches it). Used by the Electro Darna import. */
export async function uploadFromUrl(file: string, folder: (typeof FOLDERS)[number]) {
  const cfg = config();
  if (!cfg) throw new ConvexError({ code: "CONFIG", message: "Cloudinary n'est pas configuré (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET)." });
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: `${cfg.root}/${folder}`, timestamp };
  const body = new FormData();
  body.set("file", file);
  body.set("folder", params.folder);
  body.set("timestamp", String(timestamp));
  body.set("api_key", cfg.apiKey);
  body.set("signature", await sign(params, cfg.apiSecret));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, { method: "POST", body });
  const data = (await res.json()) as { public_id?: string; secure_url?: string; width?: number; height?: number; error?: { message: string } };
  if (!res.ok || !data.public_id || !data.secure_url) throw new Error(`Cloudinary: ${data.error?.message ?? res.status}`);
  return { publicId: data.public_id, url: data.secure_url, width: data.width, height: data.height };
}

export const _canUpload = internalQuery({
  args: { folder: vFolder },
  handler: async (ctx, { folder }) => {
    const user = await getStaffUser(ctx);
    if (!user) return false;
    const permission = folder === "products" || folder === "categories" || folder === "brands" ? "catalog" : folder === "settings" ? "settings" : "content";
    return roleCan(user.role, permission);
  },
});

/**
 * Returns a short-lived signature so the browser can upload straight to
 * Cloudinary. The API secret never leaves the Convex deployment.
 */
export const signUpload = action({
  args: { folder: vFolder },
  handler: async (ctx, { folder }) => {
    const allowed = await ctx.runQuery(internal.cloudinary._canUpload, { folder });
    if (!allowed) throw new ConvexError({ code: "FORBIDDEN", message: "Accès refusé." });
    const cfg = config();
    if (!cfg) {
      throw new ConvexError({
        code: "CONFIG",
        message: "Cloudinary n'est pas configuré (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).",
      });
    }
    if (!FOLDERS.includes(folder)) throw new ConvexError("Dossier invalide.");
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { folder: `${cfg.root}/${folder}`, timestamp };
    const signature = await sign(params, cfg.apiSecret);
    return {
      ...params,
      signature,
      apiKey: cfg.apiKey,
      cloudName: cfg.cloudName,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
    };
  },
});

export const destroyMany = internalAction({
  args: { publicIds: v.array(v.string()) },
  handler: async (_ctx, { publicIds }) => {
    const cfg = config();
    if (!cfg) return;
    for (const publicId of publicIds) {
      // Only delete assets that live in this store's folder.
      if (!publicId.startsWith(`${cfg.root}/`)) continue;
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = await sign({ public_id: publicId, timestamp }, cfg.apiSecret);
      const body = new URLSearchParams({
        public_id: publicId,
        timestamp: String(timestamp),
        api_key: cfg.apiKey,
        signature,
      });
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/destroy`, {
        method: "POST",
        body,
      });
      if (!res.ok) console.error("Cloudinary destroy failed", publicId, await res.text());
    }
  },
});
