import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "./breadcrumbs";
import { JsonLd } from "@/components/shared/json-ld";
import { getBaseUrl } from "@/lib/seo";

export type ContentKey = "about" | "faq" | "delivery" | "returns" | "privacy" | "terms";

/** Renders a translated static page (sections or FAQ items) from the message catalogs. */
export async function ContentPage({ locale, contentKey, path }: { locale: string; contentKey: ContentKey; path: string }) {
  const t = await getTranslations({ locale });
  const base = await getBaseUrl();
  const title = t(`content.${contentKey}.title`);
  const isFaq = contentKey === "faq";
  const sections = isFaq ? [] : (t.raw(`content.${contentKey}.sections`) as { h: string; p: string }[]);
  const faq = isFaq ? (t.raw("content.faq.items") as { q: string; a: string }[]) : [];

  return (
    <div className="container-page py-6 sm:py-8">
      <Breadcrumbs items={[{ name: title, href: path }]} locale={locale} base={base} homeLabel={t("common.home")} />
      <article className="mx-auto mt-6 max-w-3xl">
        <h1 className="text-3xl font-extrabold text-navy sm:text-4xl">{title}</h1>
        {sections.length > 0 && (
          <div className="mt-8 space-y-8">
            {sections.map((s, i) => (
              <section key={i}>
                <h2 className="text-xl font-bold text-navy">{s.h}</h2>
                <p className="mt-2 leading-relaxed text-foreground/80">{s.p}</p>
              </section>
            ))}
          </div>
        )}
        {isFaq && (
          <>
            <div className="mt-8 divide-y rounded-2xl border">
              {faq.map((f, i) => (
                <details key={i} className="group p-5 [&_summary::-webkit-details-marker]:hidden" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-navy">
                    {f.q}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-primary transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-foreground/80">{f.a}</p>
                </details>
              ))}
            </div>
            <JsonLd
              data={{
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
              }}
            />
          </>
        )}
      </article>
    </div>
  );
}
