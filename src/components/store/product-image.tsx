import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageAsset } from "@/lib/cloudinary";

/** Product image with an elegant placeholder when no image is uploaded yet. */
export function ProductImage({
  image,
  alt,
  sizes,
  priority,
  className,
  imgClassName,
}: {
  image: ImageAsset | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-white", className)}>
      {image?.url ? (
        <Image
          src={image.url}
          alt={image.alt || alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-contain p-3", imgClassName)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-secondary to-accent/60">
          <ImageOff className="size-8 text-muted-foreground/40" aria-hidden />
        </div>
      )}
    </div>
  );
}
