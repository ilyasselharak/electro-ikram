"use client";

import type { ImageAsset } from "@/lib/cloudinary";
import { Field, inputClass } from "@/components/shared/field";
import { Switch } from "@/components/ui/switch";
import { SingleImageUpload } from "./image-uploader";

export type SeoValue = {
  titleFr?: string;
  titleAr?: string;
  descriptionFr?: string;
  descriptionAr?: string;
  focusKeyword?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: ImageAsset;
  noindex?: boolean;
  nofollow?: boolean;
};

function Counter({ value, max }: { value?: string; max: number }) {
  const n = value?.length ?? 0;
  return <span className={n > max ? "text-destructive" : "text-muted-foreground"}>{n}/{max}</span>;
}

/** Removes empty strings so optional validators accept the object. */
export function cleanSeo(seo: SeoValue | undefined): SeoValue | undefined {
  if (!seo) return undefined;
  const out: SeoValue = {};
  for (const [k, v] of Object.entries(seo)) {
    if (typeof v === "string") {
      if (v.trim()) (out as Record<string, unknown>)[k] = v.trim();
    } else if (Array.isArray(v)) {
      if (v.length) (out as Record<string, unknown>)[k] = v;
    } else if (v !== undefined && v !== null) (out as Record<string, unknown>)[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Per-entity SEO editor with a live Google snippet preview. */
export function SeoFields({
  value = {},
  onChange,
  previewUrl,
  fallbackTitle,
  fallbackDescription,
  showFocusKeyword = true,
}: {
  value?: SeoValue;
  onChange: (v: SeoValue) => void;
  previewUrl: string;
  fallbackTitle: string;
  fallbackDescription?: string;
  showFocusKeyword?: boolean;
}) {
  const set = (patch: Partial<SeoValue>) => onChange({ ...value, ...patch });
  const title = value.titleFr || fallbackTitle;
  const desc = value.descriptionFr || fallbackDescription || "";
  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-secondary/40 p-4">
        <p className="text-xs text-muted-foreground">Aperçu Google (FR)</p>
        <p className="mt-1 truncate text-xs text-emerald-700">{previewUrl}</p>
        <p className="truncate text-lg leading-snug text-[#1a0dab]">{title} | Electro-Ikram</p>
        <p className="line-clamp-2 text-sm text-zinc-600">{desc || "Ajoutez une méta-description pour améliorer le taux de clic."}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={<span className="flex w-full justify-between">Titre SEO (FR) <Counter value={value.titleFr} max={60} /></span>}>
          <input className={inputClass} value={value.titleFr ?? ""} onChange={(e) => set({ titleFr: e.target.value })} placeholder={fallbackTitle} />
        </Field>
        <Field label={<span className="flex w-full justify-between">Titre SEO (AR) <Counter value={value.titleAr} max={60} /></span>}>
          <input className={inputClass} dir="rtl" value={value.titleAr ?? ""} onChange={(e) => set({ titleAr: e.target.value })} />
        </Field>
        <Field label={<span className="flex w-full justify-between">Méta-description (FR) <Counter value={value.descriptionFr} max={160} /></span>}>
          <textarea rows={3} className={`${inputClass} h-auto py-2`} value={value.descriptionFr ?? ""} onChange={(e) => set({ descriptionFr: e.target.value })} />
        </Field>
        <Field label={<span className="flex w-full justify-between">Méta-description (AR) <Counter value={value.descriptionAr} max={160} /></span>}>
          <textarea rows={3} dir="rtl" className={`${inputClass} h-auto py-2`} value={value.descriptionAr ?? ""} onChange={(e) => set({ descriptionAr: e.target.value })} />
        </Field>
        {showFocusKeyword && (
          <Field label="Mot-clé principal">
            <input className={inputClass} value={value.focusKeyword ?? ""} onChange={(e) => set({ focusKeyword: e.target.value })} />
          </Field>
        )}
        <Field label="Mots-clés additionnels" hint="Séparés par des virgules">
          <input
            className={inputClass}
            defaultValue={(value.keywords ?? []).join(", ")}
            onBlur={(e) => set({ keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
        </Field>
        <Field label="URL canonique" hint="Laisser vide pour utiliser l'URL de la page." className="md:col-span-2">
          <input className={inputClass} type="url" value={value.canonicalUrl ?? ""} onChange={(e) => set({ canonicalUrl: e.target.value })} placeholder="https://" />
        </Field>
        <Field label="Titre Open Graph">
          <input className={inputClass} value={value.ogTitle ?? ""} onChange={(e) => set({ ogTitle: e.target.value })} />
        </Field>
        <Field label="Description Open Graph">
          <input className={inputClass} value={value.ogDescription ?? ""} onChange={(e) => set({ ogDescription: e.target.value })} />
        </Field>
        <Field label="Image Open Graph" hint="1200 × 630 recommandé. Par défaut : image principale.">
          <SingleImageUpload folder="products" value={value.ogImage} onChange={(img) => set({ ogImage: img })} />
        </Field>
        <div className="space-y-4 self-start rounded-xl border p-4">
          <label className="flex items-center justify-between gap-3 text-sm font-medium">
            Ne pas indexer (noindex)
            <Switch checked={!!value.noindex} onCheckedChange={(v) => set({ noindex: v })} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm font-medium">
            Ne pas suivre les liens (nofollow)
            <Switch checked={!!value.nofollow} onCheckedChange={(v) => set({ nofollow: v })} />
          </label>
        </div>
      </div>
    </div>
  );
}
