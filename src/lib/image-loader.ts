/**
 * Global next/image loader. Cloudinary URLs get automatic format (WebP/AVIF),
 * automatic quality and a width-bounded resize. Other sources pass through.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  if (src.startsWith("https://res.cloudinary.com/") && src.includes("/image/upload/")) {
    const q = quality ? `q_${quality}` : "q_auto";
    return src.replace("/image/upload/", `/image/upload/f_auto,${q},c_limit,w_${width}/`);
  }
  if (src.startsWith("/")) return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
  return src;
}
