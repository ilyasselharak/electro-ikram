import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ImageAsset } from "@/lib/cloudinary";

/** Brand wordmark. Uses the uploaded logo from store settings when present. */
export function Logo({ logo, className, inverted }: { logo?: ImageAsset | null; className?: string; inverted?: boolean }) {
  if (logo?.url) {
    return (
      <Image
        src={logo.url}
        alt="Electro-Ikram"
        width={logo.width ?? 180}
        height={logo.height ?? 48}
        className={cn("h-9 w-auto object-contain", className)}
        priority
      />
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)} dir="ltr">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
          <path d="M13.2 2.5 5.6 13.1c-.4.6 0 1.4.7 1.4h4.4l-1.4 6.6c-.2.9.9 1.4 1.5.7l7.6-10.6c.4-.6 0-1.4-.7-1.4h-4.4l1.4-6.6c.2-.9-.9-1.4-1.5-.7Z" />
        </svg>
      </span>
      <span className={cn("text-[1.15rem] font-extrabold tracking-tight", inverted ? "text-white" : "text-navy")}>
        Electro<span className="text-primary">-Ikram</span>
      </span>
    </span>
  );
}
