export type ImageAsset = {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

type Transform = { width?: number; height?: number; crop?: "fill" | "limit" | "pad"; format?: "auto" | "jpg" };

/** Builds a transformed Cloudinary URL from a stored secure URL. */
export function cldUrl(image: ImageAsset | null | undefined, t: Transform = {}) {
  if (!image?.url) return undefined;
  if (!image.url.includes("/image/upload/")) return image.url;
  const parts = [
    `f_${t.format ?? "auto"}`,
    "q_auto",
    t.crop ? `c_${t.crop}` : "c_limit",
    t.width ? `w_${t.width}` : null,
    t.height ? `h_${t.height}` : null,
    t.crop === "pad" ? "b_white" : null,
  ].filter(Boolean);
  return image.url.replace("/image/upload/", `/image/upload/${parts.join(",")}/`);
}

/** 1200×630 JPEG suitable for Open Graph / Twitter cards. */
export function ogImageUrl(image: ImageAsset | null | undefined) {
  return cldUrl(image, { width: 1200, height: 630, crop: "pad", format: "jpg" });
}
