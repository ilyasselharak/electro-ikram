"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { RequirePermission } from "@/components/admin/admin-shell";
import { SingleImageUpload } from "@/components/admin/image-uploader";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import type { ImageAsset } from "@/lib/cloudinary";

type SeoForm = {
  siteTitleFr: string;
  siteTitleAr: string;
  siteDescriptionFr: string;
  siteDescriptionAr: string;
  keywords: string;
  ogImage?: ImageAsset;
  canonicalBase: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  twitterHandle: string;
};

function SeoEditor({ initial }: { initial: SeoForm }) {
  const [f, setF] = useState(initial);
  const set = (p: Partial<SeoForm>) => setF((s) => ({ ...s, ...p }));
  const save = useAdminMutation(api.settings.updateSeo, { success: "Paramètres SEO enregistrés" });
  const o = (s: string) => s.trim() || undefined;

  return (
    <div className="space-y-6">
      <Panel title="Métadonnées globales" description="Utilisées pour la page d'accueil et comme valeurs par défaut.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={`Titre du site (FR) · ${f.siteTitleFr.length}/60`}><input className={inputClass} value={f.siteTitleFr} onChange={(e) => set({ siteTitleFr: e.target.value })} /></Field>
          <Field label={`Titre du site (AR) · ${f.siteTitleAr.length}/60`}><input className={inputClass} dir="rtl" value={f.siteTitleAr} onChange={(e) => set({ siteTitleAr: e.target.value })} /></Field>
          <Field label={`Description (FR) · ${f.siteDescriptionFr.length}/160`}><textarea rows={3} className={`${inputClass} h-auto py-2`} value={f.siteDescriptionFr} onChange={(e) => set({ siteDescriptionFr: e.target.value })} /></Field>
          <Field label={`Description (AR) · ${f.siteDescriptionAr.length}/160`}><textarea rows={3} dir="rtl" className={`${inputClass} h-auto py-2`} value={f.siteDescriptionAr} onChange={(e) => set({ siteDescriptionAr: e.target.value })} /></Field>
          <Field label="Mots-clés par défaut" hint="Séparés par des virgules" className="md:col-span-2"><input className={inputClass} value={f.keywords} onChange={(e) => set({ keywords: e.target.value })} /></Field>
        </div>
      </Panel>
      <Panel title="Partage social">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <Field label="Image Open Graph par défaut" hint="1200 × 630 px">
            <SingleImageUpload folder="settings" value={f.ogImage} onChange={(ogImage) => set({ ogImage })} aspect="aspect-[1200/630]" />
          </Field>
          <Field label="Compte X / Twitter" hint="Ex. : @electroikram"><input className={inputClass} value={f.twitterHandle} onChange={(e) => set({ twitterHandle: e.target.value })} /></Field>
        </div>
      </Panel>
      <Panel title="Indexation et URL canonique">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="URL canonique du site" hint="Domaine de production, ex. https://www.electro-ikram.ma (utilisé pour canonical, sitemap, hreflang)." className="md:col-span-2">
            <input className={inputClass} type="url" value={f.canonicalBase} onChange={(e) => set({ canonicalBase: e.target.value })} placeholder="https://" />
          </Field>
          <label className="flex items-center justify-between rounded-xl border p-4 text-sm font-medium">
            <span>Autoriser l&apos;indexation (index)<span className="block text-xs font-normal text-muted-foreground">Désactiver bloque tout le site dans robots.txt.</span></span>
            <Switch checked={f.robotsIndex} onCheckedChange={(v) => set({ robotsIndex: v })} />
          </label>
          <label className="flex items-center justify-between rounded-xl border p-4 text-sm font-medium">
            Suivre les liens (follow) <Switch checked={f.robotsFollow} onCheckedChange={(v) => set({ robotsFollow: v })} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a href="/sitemap.xml" target="_blank" className="inline-flex items-center gap-1 text-primary hover:underline">sitemap.xml <ExternalLink className="size-3.5" /></a>
          <a href="/robots.txt" target="_blank" className="inline-flex items-center gap-1 text-primary hover:underline">robots.txt <ExternalLink className="size-3.5" /></a>
        </div>
      </Panel>
      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={save.pending}
          onClick={() =>
            save.run({
              siteTitleFr: o(f.siteTitleFr),
              siteTitleAr: o(f.siteTitleAr),
              siteDescriptionFr: o(f.siteDescriptionFr),
              siteDescriptionAr: o(f.siteDescriptionAr),
              keywords: f.keywords.split(",").map((k) => k.trim()).filter(Boolean),
              ogImage: f.ogImage,
              canonicalBase: o(f.canonicalBase)?.replace(/\/$/, ""),
              robotsIndex: f.robotsIndex,
              robotsFollow: f.robotsFollow,
              twitterHandle: o(f.twitterHandle),
            })
          }
        >
          {save.pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer
        </Button>
      </div>
    </div>
  );
}

function SeoInner() {
  const s = useQuery(api.settings.adminGet);
  if (!s) return <Skeleton className="h-96 rounded-2xl" />;
  return (
    <SeoEditor
      initial={{
        siteTitleFr: s.seo.siteTitleFr ?? "",
        siteTitleAr: s.seo.siteTitleAr ?? "",
        siteDescriptionFr: s.seo.siteDescriptionFr ?? "",
        siteDescriptionAr: s.seo.siteDescriptionAr ?? "",
        keywords: (s.seo.keywords ?? []).join(", "),
        ogImage: s.seo.ogImage,
        canonicalBase: s.seo.canonicalBase ?? "",
        robotsIndex: s.seo.robotsIndex,
        robotsFollow: s.seo.robotsFollow,
        twitterHandle: s.seo.twitterHandle ?? "",
      }}
    />
  );
}

export default function SeoPage() {
  return (
    <RequirePermission perm="content">
      <PageHeader title="SEO" description="Référencement global. Le SEO de chaque produit et catégorie se règle dans leur fiche." />
      <SeoInner />
    </RequirePermission>
  );
}
