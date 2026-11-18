"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ImageAsset } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

export type HeroBanner = {
  _id: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  link?: string;
  image: ImageAsset | null;
  mobileImage: ImageAsset | null;
  theme: "light" | "dark";
};

function BannerLink({ href, children, className }: { href?: string; children: React.ReactNode; className?: string }) {
  if (!href) return <div className={className}>{children}</div>;
  if (/^https?:\/\//.test(href)) return <a href={href} className={className}>{children}</a>;
  return <Link href={href} className={className}>{children}</Link>;
}

export function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const locale = useLocale();
  const count = banners.length;
  const go = useCallback((i: number) => setIndex((i + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count, paused]);

  const b = banners[index];
  const rtl = locale === "ar";

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-navy sm:rounded-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="relative aspect-[4/5] sm:aspect-[16/7] lg:aspect-[16/6]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={b._id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <BannerLink href={b.link} className="block size-full">
              {b.image && (
                <Image
                  src={b.image.url}
                  alt={b.image.alt || b.title || ""}
                  fill
                  priority={index === 0}
                  sizes="(min-width: 1280px) 1216px, 100vw"
                  className={cn("object-cover", b.mobileImage && "hidden sm:block")}
                />
              )}
              {b.mobileImage && (
                <Image
                  src={b.mobileImage.url}
                  alt={b.mobileImage.alt || b.title || ""}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover sm:hidden"
                />
              )}
              {(b.title || b.subtitle || b.cta) && (
                <div
                  className={cn(
                    "absolute inset-0 flex items-end p-6 sm:items-center sm:p-12 lg:p-16",
                    b.theme === "dark"
                      ? "bg-gradient-to-t from-navy/85 via-navy/30 to-transparent sm:bg-gradient-to-r rtl:sm:bg-gradient-to-l sm:from-navy/80 sm:via-navy/35"
                      : "",
                  )}
                >
                  <div className={cn("max-w-lg", b.theme === "dark" ? "text-white" : "text-navy")}>
                    {b.title && <h2 className="text-2xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">{b.title}</h2>}
                    {b.subtitle && <p className="mt-3 text-sm opacity-90 sm:text-lg">{b.subtitle}</p>}
                    {b.cta && (
                      <span className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30">
                        {b.cta}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </BannerLink>
          </motion.div>
        </AnimatePresence>
      </div>
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(rtl ? index + 1 : index - 1)}
            className="absolute start-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy shadow hover:bg-white sm:grid"
            aria-label="Previous"
          >
            <ChevronLeft className="rtl-flip size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(rtl ? index - 1 : index + 1)}
            className="absolute end-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy shadow hover:bg-white sm:grid"
            aria-label="Next"
          >
            <ChevronRight className="rtl-flip size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {banners.map((x, i) => (
              <button
                key={x._id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${i + 1} / ${count}`}
                aria-current={i === index}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-white" : "w-1.5 bg-white/50")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
