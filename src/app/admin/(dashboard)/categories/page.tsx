"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { CategorySelect, flattenCategories } from "@/components/admin/category-select";
import { SingleImageUpload } from "@/components/admin/image-uploader";
import { SeoFields, cleanSeo, type SeoValue } from "@/components/admin/seo-fields";
import { RequirePermission } from "@/components/admin/admin-shell";
import { DynamicIcon, ICON_NAMES } from "@/components/shared/category-icon";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { slugifyClient } from "@/lib/slug";
import type { ImageAsset } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

type Cat = Doc<"categories"> & { productCount: number };

type FormState = {
  nameFr: string;
  nameAr: string;
  slug: string;
  descriptionFr: string;
  descriptionAr: string;
  parentId: string;
  icon: string;
  image?: ImageAsset;
  banner?: ImageAsset;
  isActive: boolean;
  showInMenu: boolean;
  seo: SeoValue;
};

const empty: FormState = { nameFr: "", nameAr: "", slug: "", descriptionFr: "", descriptionAr: "", parentId: "", icon: "grid", isActive: true, showInMenu: true, seo: {} };

function CategoryDialog({ open, onOpenChange, category }: { open: boolean; onOpenChange: (o: boolean) => void; category: Cat | null }) {
  const [f, setF] = useState<FormState>(() =>
    category
      ? {
          nameFr: category.nameFr,
          nameAr: category.nameAr,
          slug: category.slug,
          descriptionFr: category.descriptionFr ?? "",
          descriptionAr: category.descriptionAr ?? "",
          parentId: category.parentId ?? "",
          icon: category.icon ?? "grid",
          image: category.image,
          banner: category.banner,
          isActive: category.isActive,
          showInMenu: category.showInMenu !== false,
          seo: category.seo ?? {},
        }
      : empty,
  );
  const set = (p: Partial<FormState>) => setF((s) => ({ ...s, ...p }));
  const create = useAdminMutation(api.categories.create, { success: "Catégorie créée" });
  const update = useAdminMutation(api.categories.update, { success: "Catégorie enregistrée" });
  const pending = create.pending || update.pending;
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (f.nameFr.trim().length < 2 || f.nameAr.trim().length < 2) {
      setError("Les noms FR et AR sont requis.");
      return;
    }
    const payload = {
      nameFr: f.nameFr,
      nameAr: f.nameAr,
      slug: f.slug || undefined,
      descriptionFr: f.descriptionFr || undefined,
      descriptionAr: f.descriptionAr || undefined,
      parentId: (f.parentId || undefined) as Id<"categories"> | undefined,
      icon: f.icon,
      image: f.image,
      banner: f.banner,
      isActive: f.isActive,
      showInMenu: f.showInMenu,
      seo: cleanSeo(f.seo),
    };
    const ok = category ? await update.run({ id: category._id, ...payload, order: category.order }) : await create.run(payload);
    if (ok !== undefined) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{category ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="media">Images</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="grid gap-4 pt-4 md:grid-cols-2">
            <Field label="Nom (FR)" required>
              <input className={inputClass} value={f.nameFr} onChange={(e) => set({ nameFr: e.target.value })} />
            </Field>
            <Field label="Nom (AR)" required>
              <input className={inputClass} dir="rtl" value={f.nameAr} onChange={(e) => set({ nameAr: e.target.value })} />
            </Field>
            <Field label="Slug" hint={`/category/${f.slug || slugifyClient(f.nameFr) || "…"}`}>
              <input className={inputClass} value={f.slug} onChange={(e) => set({ slug: e.target.value })} placeholder={slugifyClient(f.nameFr)} />
            </Field>
            <Field label="Catégorie parente">
              <CategorySelect value={f.parentId} onChange={(v) => set({ parentId: v })} allowEmpty emptyLabel="— Aucune (catégorie principale) —" excludeId={category?._id} />
            </Field>
            <Field label="Description (FR)">
              <textarea rows={3} className={`${inputClass} h-auto py-2`} value={f.descriptionFr} onChange={(e) => set({ descriptionFr: e.target.value })} />
            </Field>
            <Field label="Description (AR)">
              <textarea rows={3} dir="rtl" className={`${inputClass} h-auto py-2`} value={f.descriptionAr} onChange={(e) => set({ descriptionAr: e.target.value })} />
            </Field>
            <Field label="Icône" className="md:col-span-2">
              <div className="flex flex-wrap gap-1.5">
                {ICON_NAMES.map((n) => (
                  <button key={n} type="button" onClick={() => set({ icon: n })} title={n} className={cn("grid size-9 place-items-center rounded-lg border", f.icon === n ? "border-primary bg-primary text-white" : "hover:border-primary")}>
                    <DynamicIcon name={n} className="size-4" />
                  </button>
                ))}
              </div>
            </Field>
            <label className="flex items-center justify-between rounded-xl border p-3 text-sm font-medium">
              Catégorie active <Switch checked={f.isActive} onCheckedChange={(v) => set({ isActive: v })} />
            </label>
            <label className="flex items-center justify-between rounded-xl border p-3 text-sm font-medium">
              Afficher dans le menu <Switch checked={f.showInMenu} onCheckedChange={(v) => set({ showInMenu: v })} />
            </label>
          </TabsContent>
          <TabsContent value="media" className="grid gap-4 pt-4 md:grid-cols-[200px_1fr]">
            <Field label="Image / vignette">
              <SingleImageUpload folder="categories" value={f.image} onChange={(img) => set({ image: img })} aspect="aspect-square" />
            </Field>
            <Field label="Bannière (page catégorie)" hint="Format large recommandé : 1600 × 500.">
              <SingleImageUpload folder="categories" value={f.banner} onChange={(img) => set({ banner: img })} aspect="aspect-[16/5]" />
            </Field>
          </TabsContent>
          <TabsContent value="seo" className="pt-4">
            <SeoFields value={f.seo} onChange={(seo) => set({ seo })} previewUrl={`electro-ikram.ma › fr › category › ${f.slug || slugifyClient(f.nameFr)}`} fallbackTitle={f.nameFr || "Catégorie"} fallbackDescription={f.descriptionFr} showFocusKeyword={false} />
          </TabsContent>
        </Tabs>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesInner() {
  const cats = useQuery(api.categories.adminList) as Cat[] | undefined;
  const [editing, setEditing] = useState<Cat | null>(null);
  const [open, setOpen] = useState(false);
  const toggle = useAdminMutation(api.categories.toggleActive);
  const reorder = useAdminMutation(api.categories.reorder);
  const remove = useAdminMutation(api.categories.remove, { success: "Catégorie supprimée" });
  const flat = cats ? flattenCategories(cats) : [];

  const move = (cat: Cat, dir: -1 | 1) => {
    if (!cats) return;
    const siblings = cats.filter((c) => (c.parentId ?? null) === (cat.parentId ?? null)).sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((s) => s._id === cat._id);
    const target = idx + dir;
    if (target < 0 || target >= siblings.length) return;
    const ids = siblings.map((s) => s._id);
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    reorder.run({ ids });
  };

  return (
    <div>
      <PageHeader
        title="Catégories"
        description="Organisez votre catalogue en catégories et sous-catégories."
        actions={
          <Button className="rounded-lg" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="size-4" /> Nouvelle catégorie
          </Button>
        }
      />
      <div className="overflow-hidden rounded-2xl border bg-white">
        {!cats ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : flat.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">Aucune catégorie.</p>
        ) : (
          <ul className="divide-y">
            {flat.map(({ cat, depth }) => {
              const c = cat as Cat;
              return (
                <li key={c._id} className="flex items-center gap-3 px-4 py-3" style={{ paddingInlineStart: 16 + depth * 28 }}>
                  <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-accent text-primary">
                    {c.image ? <Image src={c.image.url} alt="" fill sizes="40px" className="object-contain p-0.5" /> : <DynamicIcon name={c.icon} className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {depth > 0 && <span className="text-muted-foreground">└ </span>}
                      {c.nameFr} <span className="text-sm text-muted-foreground" dir="rtl">· {c.nameAr}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">/{c.slug} · {c.productCount} produit(s){c.showInMenu === false ? " · hors menu" : ""}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => move(c, -1)} className="grid size-8 place-items-center rounded-lg hover:bg-secondary" aria-label="Monter"><ArrowUp className="size-4" /></button>
                    <button type="button" onClick={() => move(c, 1)} className="grid size-8 place-items-center rounded-lg hover:bg-secondary" aria-label="Descendre"><ArrowDown className="size-4" /></button>
                    <Switch checked={c.isActive} onCheckedChange={(v) => toggle.run({ id: c._id, isActive: v }, { success: v ? "Catégorie activée" : "Catégorie désactivée" })} className="mx-2" aria-label="Active" />
                    <a href={`/fr/category/${c.slug}`} target="_blank" className="hidden size-8 place-items-center rounded-lg hover:bg-secondary sm:grid" aria-label="Voir"><ExternalLink className="size-4" /></a>
                    <button type="button" onClick={() => { setEditing(c); setOpen(true); }} className="grid size-8 place-items-center rounded-lg hover:bg-secondary" aria-label="Modifier"><Pencil className="size-4" /></button>
                    <ConfirmDialog
                      trigger={<button type="button" className="grid size-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10" aria-label="Supprimer"><Trash2 className="size-4" /></button>}
                      title="Supprimer cette catégorie ?"
                      description="Impossible si elle contient des produits ou des sous-catégories."
                      confirmLabel="Supprimer"
                      onConfirm={() => remove.run({ id: c._id })}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {open && <CategoryDialog key={editing?._id ?? "new"} open={open} onOpenChange={setOpen} category={editing} />}
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <RequirePermission perm="catalog">
      <CategoriesInner />
    </RequirePermission>
  );
}
