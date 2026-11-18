"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { ArrowDown, ArrowUp, ExternalLink, ImageOff, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { RequirePermission } from "@/components/admin/admin-shell";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DynamicIcon, ICON_NAMES } from "@/components/shared/category-icon";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { useDebounced } from "@/hooks/use-debounced";
import { cn } from "@/lib/utils";

type Section = Doc<"homepageSections">;
type SectionType = Section["type"];
type Item = NonNullable<Section["items"]>[number];

const TYPES: Record<SectionType, { label: string; help: string }> = {
  hero: { label: "Bannière principale (hero)", help: "Affiche les bannières « hero » actives (gérées dans Bannières)." },
  categories: { label: "Catégories", help: "Sélection de catégories ou toutes les catégories principales." },
  best_sellers: { label: "Meilleures ventes", help: "Produits choisis, sinon produits marqués « meilleure vente », sinon les plus vendus." },
  new_arrivals: { label: "Nouveautés", help: "Derniers produits publiés." },
  offers: { label: "Offres spéciales", help: "Produits choisis, sinon les produits avec la plus forte remise." },
  featured_products: { label: "Produits mis en avant", help: "Produits choisis, sinon produits marqués « mis en avant »." },
  promo_banners: { label: "Bannières promotionnelles", help: "Affiche les bannières « promo » actives." },
  brands: { label: "Marques", help: "Marques choisies, sinon les marques mises en avant." },
  why_us: { label: "Pourquoi nous choisir", help: "Liste d'arguments (icône, titre, texte)." },
  testimonials: { label: "Témoignages clients", help: "Avis réels de vos clients. N'ajoutez que des témoignages authentiques." },
  newsletter: { label: "Newsletter", help: "Formulaire d'inscription à la newsletter." },
};
const PRODUCT_TYPES: SectionType[] = ["best_sellers", "offers", "featured_products"];

function ProductPicker({ value, onChange }: { value: Id<"products">[]; onChange: (v: Id<"products">[]) => void }) {
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 250);
  const options = useQuery(api.products.adminPicker, { search: q || undefined });
  const selected = useQuery(api.products.adminGetMany, { ids: value });
  return (
    <div className="space-y-3">
      {selected && selected.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((id, i) => {
            const p = selected.find((s) => s._id === id);
            if (!p) return null;
            return (
              <li key={id} className="flex items-center gap-2 rounded-lg border p-1.5 text-sm">
                <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded bg-secondary">{p.image ? <Image src={p.image.url} alt="" fill sizes="32px" className="object-contain" /> : <ImageOff className="size-3" />}</span>
                <span className="line-clamp-1 flex-1">{p.nameFr}{p.status !== "published" && <span className="ms-1 text-xs text-amber-600">(non publié)</span>}</span>
                <button type="button" disabled={i === 0} onClick={() => { const n = [...value]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }} className="p-1 disabled:opacity-30" aria-label="Monter"><ArrowUp className="size-3.5" /></button>
                <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} className="p-1 text-destructive" aria-label="Retirer"><X className="size-3.5" /></button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit à ajouter…" className={`${inputClass} h-10 ps-9`} />
      </div>
      <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border">
        {options?.filter((o) => !value.includes(o._id)).map((o) => (
          <li key={o._id}>
            <button type="button" onClick={() => onChange([...value, o._id])} className="flex w-full items-center gap-2 p-2 text-start text-sm hover:bg-secondary">
              <Plus className="size-4 text-primary" /> <span className="line-clamp-1 flex-1">{o.nameFr}</span> <span className="text-xs text-muted-foreground">{o.sku}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemsEditor({ value, onChange, testimonials }: { value: Item[]; onChange: (v: Item[]) => void; testimonials: boolean }) {
  const set = (i: number, p: Partial<Item>) => onChange(value.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="space-y-3">
      {value.map((it, i) => (
        <div key={i} className="space-y-2 rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Élément {i + 1}</span>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-destructive" aria-label="Supprimer"><Trash2 className="size-4" /></button>
          </div>
          {!testimonials && (
            <div className="flex flex-wrap gap-1">
              {ICON_NAMES.map((n) => (
                <button key={n} type="button" onClick={() => set(i, { icon: n })} className={cn("grid size-7 place-items-center rounded border", it.icon === n ? "border-primary bg-primary text-white" : "")}>
                  <DynamicIcon name={n} className="size-3.5" />
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {!testimonials && <input className={`${inputClass} h-9`} placeholder="Titre (FR)" value={it.titleFr ?? ""} onChange={(e) => set(i, { titleFr: e.target.value })} />}
            {!testimonials && <input className={`${inputClass} h-9`} dir="rtl" placeholder="العنوان" value={it.titleAr ?? ""} onChange={(e) => set(i, { titleAr: e.target.value })} />}
            <textarea rows={2} className={`${inputClass} h-auto py-1.5`} placeholder={testimonials ? "Témoignage (FR)" : "Texte (FR)"} value={it.textFr ?? ""} onChange={(e) => set(i, { textFr: e.target.value })} />
            <textarea rows={2} dir="rtl" className={`${inputClass} h-auto py-1.5`} placeholder="النص" value={it.textAr ?? ""} onChange={(e) => set(i, { textAr: e.target.value })} />
            {testimonials && <input className={`${inputClass} h-9`} placeholder="Nom du client" value={it.author ?? ""} onChange={(e) => set(i, { author: e.target.value })} />}
            {testimonials && <input className={`${inputClass} h-9`} placeholder="Ville" value={it.city ?? ""} onChange={(e) => set(i, { city: e.target.value })} />}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, testimonials ? { textFr: "", author: "" } : { icon: "shield-check", titleFr: "", titleAr: "" }])}>
        <Plus className="size-4" /> Ajouter un élément
      </Button>
    </div>
  );
}

function SectionDialog({ section, type, open, onOpenChange }: { section: Section | null; type: SectionType; open: boolean; onOpenChange: (o: boolean) => void }) {
  const categories = useQuery(api.categories.adminList);
  const brands = useQuery(api.brands.adminList);
  const [f, setF] = useState({
    titleFr: section?.titleFr ?? "",
    titleAr: section?.titleAr ?? "",
    subtitleFr: section?.subtitleFr ?? "",
    subtitleAr: section?.subtitleAr ?? "",
    isEnabled: section?.isEnabled ?? true,
    limit: section?.limit?.toString() ?? "8",
    productIds: section?.productIds ?? [],
    categoryIds: section?.categoryIds ?? [],
    brandIds: section?.brandIds ?? [],
    items: section?.items ?? [],
  });
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  const create = useAdminMutation(api.homepage.createSection, { success: "Section ajoutée" });
  const update = useAdminMutation(api.homepage.updateSection, { success: "Section enregistrée" });
  const pending = create.pending || update.pending;
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const submit = async () => {
    const payload = {
      type,
      titleFr: f.titleFr || undefined,
      titleAr: f.titleAr || undefined,
      subtitleFr: f.subtitleFr || undefined,
      subtitleAr: f.subtitleAr || undefined,
      isEnabled: f.isEnabled,
      limit: f.limit ? Math.min(24, Math.max(1, Number(f.limit))) : undefined,
      productIds: f.productIds,
      categoryIds: f.categoryIds,
      brandIds: f.brandIds,
      items: f.items,
    };
    const r = section ? await update.run({ id: section._id, ...payload }) : await create.run(payload);
    if (r !== undefined) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{TYPES[type].label}</DialogTitle></DialogHeader>
        <p className="-mt-2 text-sm text-muted-foreground">{TYPES[type].help}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {type !== "hero" && (
            <>
              <Field label="Titre (FR)"><input className={inputClass} value={f.titleFr} onChange={(e) => set({ titleFr: e.target.value })} /></Field>
              <Field label="Titre (AR)"><input className={inputClass} dir="rtl" value={f.titleAr} onChange={(e) => set({ titleAr: e.target.value })} /></Field>
              <Field label="Sous-titre (FR)"><input className={inputClass} value={f.subtitleFr} onChange={(e) => set({ subtitleFr: e.target.value })} /></Field>
              <Field label="Sous-titre (AR)"><input className={inputClass} dir="rtl" value={f.subtitleAr} onChange={(e) => set({ subtitleAr: e.target.value })} /></Field>
            </>
          )}
          {[...PRODUCT_TYPES, "new_arrivals", "categories"].includes(type) && (
            <Field label="Nombre d'éléments affichés"><input inputMode="numeric" className={inputClass} value={f.limit} onChange={(e) => set({ limit: e.target.value })} /></Field>
          )}
          <label className="flex items-center justify-between self-end rounded-xl border p-3 text-sm font-medium">Section visible <Switch checked={f.isEnabled} onCheckedChange={(v) => set({ isEnabled: v })} /></label>
        </div>
        {PRODUCT_TYPES.includes(type) && (
          <Field label="Produits sélectionnés (optionnel)">
            <ProductPicker value={f.productIds} onChange={(productIds) => set({ productIds })} />
          </Field>
        )}
        {type === "categories" && (
          <Field label="Catégories affichées (vide = catégories principales)">
            <div className="flex flex-wrap gap-1.5">
              {categories?.map((c) => (
                <button key={c._id} type="button" onClick={() => set({ categoryIds: toggleIn(f.categoryIds, c._id) })} className={cn("rounded-full border px-3 py-1 text-sm", f.categoryIds.includes(c._id) ? "border-primary bg-primary text-white" : "hover:border-primary")}>
                  {f.categoryIds.includes(c._id) && `${f.categoryIds.indexOf(c._id) + 1}. `}{c.nameFr}
                </button>
              ))}
            </div>
          </Field>
        )}
        {type === "brands" && (
          <Field label="Marques affichées (vide = marques mises en avant)">
            <div className="flex flex-wrap gap-1.5">
              {brands?.map((b) => (
                <button key={b._id} type="button" onClick={() => set({ brandIds: toggleIn(f.brandIds, b._id) })} className={cn("rounded-full border px-3 py-1 text-sm", f.brandIds.includes(b._id) ? "border-primary bg-primary text-white" : "hover:border-primary")}>
                  {b.name}
                </button>
              ))}
            </div>
          </Field>
        )}
        {(type === "why_us" || type === "testimonials") && (
          <Field label="Éléments">
            <ItemsEditor value={f.items} onChange={(items) => set({ items })} testimonials={type === "testimonials"} />
          </Field>
        )}
        {(type === "hero" || type === "promo_banners") && (
          <Link href="/admin/banners" className="text-sm text-primary hover:underline">Gérer les bannières →</Link>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HomepageInner() {
  const sections = useQuery(api.homepage.adminSections);
  const [dialog, setDialog] = useState<{ section: Section | null; type: SectionType } | null>(null);
  const [newType, setNewType] = useState<SectionType>("featured_products");
  const toggle = useAdminMutation(api.homepage.toggleSection);
  const reorder = useAdminMutation(api.homepage.reorderSections);
  const remove = useAdminMutation(api.homepage.removeSection, { success: "Section supprimée" });

  const move = (i: number, dir: -1 | 1) => {
    if (!sections) return;
    const ids = sections.map((s) => s._id);
    const t = i + dir;
    if (t < 0 || t >= ids.length) return;
    [ids[i], ids[t]] = [ids[t], ids[i]];
    reorder.run({ ids });
  };

  return (
    <div>
      <PageHeader
        title="Page d'accueil"
        description="Composez la page d'accueil : ordre, visibilité et contenu de chaque section."
        actions={
          <>
            <a href="/fr" target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm hover:bg-secondary"><ExternalLink className="size-4" /> Aperçu</a>
            <select value={newType} onChange={(e) => setNewType(e.target.value as SectionType)} className="h-9 rounded-lg border bg-white px-2 text-sm">
              {(Object.keys(TYPES) as SectionType[]).map((t) => <option key={t} value={t}>{TYPES[t].label}</option>)}
            </select>
            <Button className="h-9 rounded-lg" onClick={() => setDialog({ section: null, type: newType })}><Plus className="size-4" /> Ajouter</Button>
          </>
        }
      />
      {!sections ? <Skeleton className="h-96 rounded-2xl" /> : (
        <ol className="space-y-2">
          {sections.map((s, i) => (
            <li key={s._id} className={cn("flex items-center gap-3 rounded-2xl border bg-white p-4", !s.isEnabled && "opacity-60")}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-bold tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{TYPES[s.type].label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.titleFr || "Sans titre"}
                  {s.productIds?.length ? ` · ${s.productIds.length} produit(s) choisis` : ""}
                  {s.items?.length ? ` · ${s.items.length} élément(s)` : ""}
                  {s.type === "testimonials" && !s.items?.length ? " · aucun témoignage (section masquée)" : ""}
                </p>
              </div>
              <button type="button" onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-lg hover:bg-secondary" aria-label="Monter"><ArrowUp className="size-4" /></button>
              <button type="button" onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-lg hover:bg-secondary" aria-label="Descendre"><ArrowDown className="size-4" /></button>
              <Switch checked={s.isEnabled} onCheckedChange={(v) => toggle.run({ id: s._id, isEnabled: v })} aria-label="Visible" />
              <button type="button" onClick={() => setDialog({ section: s, type: s.type })} className="grid size-8 place-items-center rounded-lg hover:bg-secondary" aria-label="Modifier"><Pencil className="size-4" /></button>
              <ConfirmDialog trigger={<button type="button" className="grid size-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10" aria-label="Supprimer"><Trash2 className="size-4" /></button>} title="Supprimer cette section ?" confirmLabel="Supprimer" onConfirm={() => remove.run({ id: s._id })} />
            </li>
          ))}
        </ol>
      )}
      {dialog && <SectionDialog key={dialog.section?._id ?? `new-${dialog.type}`} section={dialog.section} type={dialog.type} open onOpenChange={(o) => !o && setDialog(null)} />}
    </div>
  );
}

export default function HomepageAdminPage() {
  return (
    <RequirePermission perm="content">
      <HomepageInner />
    </RequirePermission>
  );
}
