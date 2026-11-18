"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Expand, ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ImageAsset } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name, discount }: { images: ImageAsset[]; name: string; discount: number }) {
  const t = useTranslations("product");
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = images.length;
  const go = (i: number) => setActive((i + count) % count);

  if (!count) {
    return (
      <div className="grid aspect-square place-items-center rounded-3xl border bg-gradient-to-br from-secondary to-accent/60">
        <ImageOff className="size-14 text-muted-foreground/40" />
      </div>
    );
  }
  const img = images[active];

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      <div className="relative flex-1">
        <div
          className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-3xl border bg-white"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => setLightbox(true)}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            const rtl = document.documentElement.dir === "rtl";
            if (Math.abs(dx) > 40) go(active + ((dx < 0) !== rtl ? 1 : -1));
            touchX.current = null;
          }}
          role="button"
          aria-label={t("zoom")}
        >
          <Image
            src={img.url}
            alt={img.alt || `${name} — ${t("imageOf", { index: active + 1, total: count })}`}
            fill
            priority
            sizes="(min-width:1024px) 560px, 100vw"
            className="object-contain p-6 transition-transform duration-200 ease-out"
            style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
          {discount > 0 && (
            <span className="absolute start-4 top-4 rounded-lg bg-sale px-2.5 py-1 text-sm font-bold text-white" dir="ltr">
              -{discount}%
            </span>
          )}
          <span className="absolute bottom-4 end-4 grid size-10 place-items-center rounded-full bg-white/90 text-navy shadow-sm opacity-0 transition group-hover:opacity-100 max-lg:opacity-100">
            <Expand className="size-4" />
          </span>
          {count > 1 && (
            <span className="absolute bottom-4 start-4 rounded-full bg-navy/70 px-2.5 py-1 text-xs font-medium text-white lg:hidden" dir="ltr">
              {active + 1}/{count}
            </span>
          )}
        </div>
      </div>
      {count > 1 && (
        <ul className="scrollbar-none flex gap-2 overflow-x-auto lg:max-h-[560px] lg:w-20 lg:flex-col lg:overflow-y-auto">
          {images.map((im, i) => (
            <li key={im.publicId} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-xl border-2 bg-white transition sm:size-20",
                  i === active ? "border-primary" : "border-transparent ring-1 ring-border hover:ring-primary/40",
                )}
                aria-label={t("imageOf", { index: i + 1, total: count })}
                aria-current={i === active}
              >
                <Image src={im.url} alt="" fill sizes="80px" className="object-contain p-1.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-[min(96vw,1100px)] border-0 bg-white p-2 sm:max-w-[min(96vw,1100px)] sm:p-4">
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <div className="relative aspect-square max-h-[82vh] w-full sm:aspect-[4/3]">
            <Image src={img.url} alt={img.alt || name} fill sizes="96vw" className="object-contain" />
          </div>
          {count > 1 && (
            <>
              <button type="button" onClick={() => go(active - 1)} className="absolute start-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow-md" aria-label="Previous">
                <ChevronLeft className="rtl-flip size-5" />
              </button>
              <button type="button" onClick={() => go(active + 1)} className="absolute end-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow-md" aria-label="Next">
                <ChevronRight className="rtl-flip size-5" />
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
