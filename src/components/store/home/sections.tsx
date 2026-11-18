import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Quote } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";
import { Link } from "@/i18n/navigation";
import { DynamicIcon } from "@/components/shared/category-icon";
import { SectionHeader } from "../section-header";
import { ProductRail } from "../product-grid";
import { NewsletterForm } from "../newsletter-form";
import { HeroCarousel } from "./hero-carousel";
import { loc } from "@/lib/format";

type Sections = FunctionReturnType<typeof api.homepage.getPublic>;
type Section = Sections[number];
type Of<T extends Section["type"]> = Extract<Section, { type: T }>;

export async function HomeSection({ section, locale, now }: { section: Section; locale: string; now: number }) {
  const t = await getTranslations({ locale });
  const title = loc(section, "title", locale);
  const subtitle = loc(section, "subtitle", locale);

  switch (section.type) {
    case "hero": {
      const s = section as Of<"hero">;
      if (!s.banners.length) {
        return (
          <section className="container-page pt-4 sm:pt-6">
            <div className="relative overflow-hidden rounded-2xl bg-navy px-6 py-14 text-white sm:rounded-3xl sm:px-12 sm:py-20 lg:px-16">
              <div className="pointer-events-none absolute -end-24 -top-24 size-96 rounded-full bg-primary/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-32 end-1/3 size-80 rounded-full bg-sky-400/20 blur-3xl" />
              <div className="relative max-w-xl">
                <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">{t("home.heroTitle")}</h1>
                <p className="mt-4 text-base text-white/75 sm:text-lg">{t("home.heroText")}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/products" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90">
                    {t("home.shopNow")} <ArrowRight className="rtl-flip size-4" />
                  </Link>
                  <Link href="/offers" className="inline-flex h-12 items-center rounded-xl border border-white/20 px-6 font-semibold hover:bg-white/10">
                    {t("home.seeOffers")}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      }
      return (
        <section className="container-page pt-4 sm:pt-6">
          <h1 className="sr-only">{t("meta.defaultTitle")}</h1>
          <HeroCarousel
            banners={s.banners.map((b) => ({
              _id: b._id,
              title: loc(b, "title", locale),
              subtitle: loc(b, "subtitle", locale),
              cta: loc(b, "cta", locale),
              link: b.link,
              image: b.image,
              mobileImage: b.mobileImage,
              theme: b.theme,
            }))}
          />
        </section>
      );
    }

    case "categories": {
      const s = section as Of<"categories">;
      if (!s.categories.length) return null;
      return (
        <section className="container-page">
          <SectionHeader title={title || t("common.categories")} subtitle={subtitle} href="/products" linkLabel={t("common.viewAll")} />
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-5 xl:grid-cols-10">
            {s.categories.map((c) => (
              <li key={c._id}>
                <Link
                  href={`/category/${c.slug}`}
                  className="group flex h-full flex-col items-center gap-2.5 rounded-2xl border border-border/70 bg-white p-3 text-center transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-4"
                >
                  <span className="relative grid aspect-square w-full max-w-20 place-items-center overflow-hidden rounded-xl bg-accent text-primary">
                    {c.image ? (
                      <Image src={c.image.url} alt="" fill sizes="80px" className="object-contain p-1.5 transition-transform group-hover:scale-110" />
                    ) : (
                      <DynamicIcon name={c.icon} className="size-7 transition-transform group-hover:scale-110 sm:size-8" />
                    )}
                  </span>
                  <span className="line-clamp-2 text-xs font-semibold leading-tight text-navy sm:text-[13px]">
                    {locale === "ar" ? c.nameAr : c.nameFr}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case "best_sellers":
    case "new_arrivals":
    case "offers":
    case "featured_products": {
      const s = section as Of<"best_sellers">;
      if (!s.products.length) return null;
      const href = section.type === "offers" ? "/offers" : section.type === "new_arrivals" ? "/products?sort=newest" : "/products?sort=popular";
      return (
        <section className={section.type === "offers" ? "bg-secondary/70 py-12 sm:py-16" : "container-page"}>
          <div className={section.type === "offers" ? "container-page" : ""}>
            <SectionHeader title={title} subtitle={subtitle} href={href} linkLabel={t("common.viewAll")} />
            <ProductRail products={s.products} now={now} />
          </div>
        </section>
      );
    }

    case "promo_banners": {
      const s = section as Of<"promo_banners">;
      if (!s.banners.length) return null;
      return (
        <section className="container-page">
          {title && <SectionHeader title={title} subtitle={subtitle} />}
          <div className={`grid gap-4 ${s.banners.length > 1 ? "md:grid-cols-2" : ""} ${s.banners.length > 2 ? "lg:grid-cols-3" : ""}`}>
            {s.banners.map((b) => {
              const bTitle = loc(b, "title", locale);
              const inner = (
                <div className="group relative aspect-[16/9] overflow-hidden rounded-2xl bg-navy">
                  {b.image && (
                    <Image
                      src={b.image.url}
                      alt={b.image.alt || bTitle}
                      fill
                      sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  {(bTitle || loc(b, "subtitle", locale)) && (
                    <div className={`absolute inset-0 flex flex-col justify-end p-5 sm:p-7 ${b.theme === "dark" ? "bg-gradient-to-t from-navy/80 to-transparent text-white" : "text-navy"}`}>
                      {bTitle && <h3 className="text-lg font-bold sm:text-2xl">{bTitle}</h3>}
                      {loc(b, "subtitle", locale) && <p className="mt-1 text-sm opacity-90">{loc(b, "subtitle", locale)}</p>}
                      {loc(b, "cta", locale) && (
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 group-hover:underline">
                          {loc(b, "cta", locale)} <ArrowRight className="rtl-flip size-4" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
              return b.link ? (
                /^https?:\/\//.test(b.link) ? (
                  <a key={b._id} href={b.link}>{inner}</a>
                ) : (
                  <Link key={b._id} href={b.link}>{inner}</Link>
                )
              ) : (
                <div key={b._id}>{inner}</div>
              );
            })}
          </div>
        </section>
      );
    }

    case "brands": {
      const s = section as Of<"brands">;
      if (!s.brands.length) return null;
      return (
        <section className="container-page">
          <SectionHeader title={title || t("common.brands")} subtitle={subtitle} href="/brands" linkLabel={t("common.viewAll")} />
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {s.brands.map((b) => (
              <li key={b._id}>
                <Link
                  href={`/brand/${b.slug}`}
                  className="group grid h-20 place-items-center rounded-2xl border border-border/70 bg-white px-4 transition hover:border-primary/30 hover:shadow-md sm:h-24"
                >
                  {b.logo ? (
                    <span className="relative block h-10 w-full sm:h-12">
                      <Image src={b.logo.url} alt={b.name} fill sizes="160px" className="object-contain opacity-80 grayscale transition group-hover:opacity-100 group-hover:grayscale-0" />
                    </span>
                  ) : (
                    <span className="text-base font-extrabold tracking-tight text-navy/70 group-hover:text-primary sm:text-lg">{b.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case "why_us": {
      const s = section as Extract<Section, { items: unknown }>;
      if (!s.items.length) return null;
      return (
        <section className="container-page">
          <SectionHeader title={title} subtitle={subtitle} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {s.items.map((it, i) => (
              <li key={i} className="rounded-2xl border border-border/70 bg-white p-6">
                <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  <DynamicIcon name={it.icon} className="size-6" />
                </span>
                <h3 className="mt-4 font-bold text-navy">{loc(it, "title", locale)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{loc(it, "text", locale)}</p>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case "testimonials": {
      const s = section as Extract<Section, { items: unknown }>;
      if (!s.items.length) return null;
      return (
        <section className="container-page">
          <SectionHeader title={title} subtitle={subtitle} />
          <ul className="grid gap-4 md:grid-cols-3">
            {s.items.map((it, i) => (
              <li key={i} className="flex flex-col rounded-2xl bg-secondary/70 p-6">
                <Quote className="rtl-flip size-7 text-primary/40" aria-hidden />
                <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-foreground/90">{loc(it, "text", locale)}</blockquote>
                <p className="mt-4 text-sm font-semibold text-navy">
                  {it.author}
                  {it.city && <span className="font-normal text-muted-foreground"> · {it.city}</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case "newsletter":
      return (
        <section className="container-page">
          <div className="relative overflow-hidden rounded-3xl bg-navy px-6 py-12 sm:px-12">
            <div className="pointer-events-none absolute -end-20 -top-20 size-72 rounded-full bg-primary/40 blur-3xl" />
            <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">{title || t("newsletter.title")}</h2>
                <p className="mt-2 text-white/70">{subtitle || t("newsletter.text")}</p>
              </div>
              <NewsletterForm dark />
            </div>
          </div>
        </section>
      );
    default:
      return null;
  }
}
