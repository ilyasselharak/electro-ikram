"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { SingleImageUpload } from "@/components/admin/image-uploader";
import { RequirePermission } from "@/components/admin/admin-shell";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import type { ImageAsset } from "@/lib/cloudinary";

type Brand = Doc<"brands"> & { productCount: number };

function BrandDialog({ open, onOpenChange, brand }: { open: boolean; onOpenChange: (o: boolean) => void; brand: Brand | null }) {
  const [f, setF] = useState({
    name: brand?.name ?? "",
    slug: brand?.slug ?? "",
    descriptionFr: brand?.descriptionFr ?? "",
    descriptionAr: brand?.descriptionAr ?? "",
    website: brand?.website ?? "",
    logo: brand?.logo as ImageAsset | undefined,
    isActive: brand?.isActive ?? true,
    isFeatured: brand?.isFeatured ?? false,
  });
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  const create = useAdminMutation(api.brands.create, { success: "Marque créée" });
  const update = useAdminMutation(api.brands.update, { success: "Marque enregistrée" });
  const pending = create.pending || update.pending;

  const submit = async () => {
    if (!f.name.trim()) return;
    const payload = { ...f, slug: f.slug || undefined, website: f.website || undefined, descriptionFr: f.descriptionFr || undefined, descriptionAr: f.descriptionAr || undefined };
    if (brand) {
      if ((await update.run({ id: brand._id, ...payload })) !== undefined) onOpenChange(false);
    } else if (await create.run(payload)) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{brand ? "Modifier la marque" : "Nouvelle marque"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <Field label="Logo">
            <SingleImageUpload folder="brands" value={f.logo} onChange={(logo) => set({ logo })} aspect="aspect-square" label="Logo" />
          </Field>
          <div className="space-y-4">
            <Field label="Nom" required>
              <input className={inputClass} value={f.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Slug">
              <input className={inputClass} value={f.slug} onChange={(e) => set({ slug: e.target.value })} />
            </Field>
            <Field label="Site web">
              <input className={inputClass} type="url" value={f.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://" />
            </Field>
          </div>
          <Field label="Description (FR)" className="md:col-span-2">
            <textarea rows={3} className={`${inputClass} h-auto py-2`} value={f.descriptionFr} onChange={(e) => set({ descriptionFr: e.target.value })} />
          </Field>
          <Field label="Description (AR)" className="md:col-span-2">
            <textarea rows={3} dir="rtl" className={`${inputClass} h-auto py-2`} value={f.descriptionAr} onChange={(e) => set({ descriptionAr: e.target.value })} />
          </Field>
          <label className="flex items-center justify-between rounded-xl border p-3 text-sm font-medium">
            Active <Switch checked={f.isActive} onCheckedChange={(v) => set({ isActive: v })} />
          </label>
          <label className="flex items-center justify-between rounded-xl border p-3 text-sm font-medium">
            Mise en avant (accueil) <Switch checked={f.isFeatured} onCheckedChange={(v) => set({ isFeatured: v })} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={pending || !f.name.trim()}>
            {pending && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BrandsInner() {
  const brands = useQuery(api.brands.adminList) as Brand[] | undefined;
  const [editing, setEditing] = useState<Brand | null>(null);
  const [open, setOpen] = useState(false);
  const reorder = useAdminMutation(api.brands.reorder);
  const remove = useAdminMutation(api.brands.remove, { success: "Marque supprimée" });

  const move = (i: number, dir: -1 | 1) => {
    if (!brands) return;
    const ids = brands.map((b) => b._id);
    const t = i + dir;
    if (t < 0 || t >= ids.length) return;
    [ids[i], ids[t]] = [ids[t], ids[i]];
    reorder.run({ ids });
  };

  return (
    <div>
      <PageHeader
        title="Marques"
        description="Logos et descriptions des marques distribuées."
        actions={<Button className="rounded-lg" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> Nouvelle marque</Button>}
      />
      {!brands ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : brands.length === 0 ? (
        <p className="rounded-2xl border bg-white p-12 text-center text-muted-foreground">Aucune marque.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b, i) => (
            <li key={b._id} className="flex items-center gap-4 rounded-2xl border bg-white p-4">
              <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white text-lg font-extrabold text-navy/60">
                {b.logo ? <Image src={b.logo.url} alt="" fill sizes="64px" className="object-contain p-1.5" /> : b.name.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-semibold">
                  {b.name} {b.isFeatured && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
                </p>
                <p className="text-xs text-muted-foreground">{b.productCount} produit(s) · {b.isActive ? "Active" : "Inactive"}</p>
              </div>
              <div className="flex flex-col">
                <button type="button" onClick={() => move(i, -1)} className="grid size-7 place-items-center rounded hover:bg-secondary" aria-label="Monter"><ArrowUp className="size-3.5" /></button>
                <button type="button" onClick={() => move(i, 1)} className="grid size-7 place-items-center rounded hover:bg-secondary" aria-label="Descendre"><ArrowDown className="size-3.5" /></button>
              </div>
              <div className="flex flex-col">
                <button type="button" onClick={() => { setEditing(b); setOpen(true); }} className="grid size-7 place-items-center rounded hover:bg-secondary" aria-label="Modifier"><Pencil className="size-3.5" /></button>
                <ConfirmDialog
                  trigger={<button type="button" className="grid size-7 place-items-center rounded text-destructive hover:bg-destructive/10" aria-label="Supprimer"><Trash2 className="size-3.5" /></button>}
                  title={`Supprimer « ${b.name} » ?`}
                  description="Impossible si des produits utilisent cette marque."
                  confirmLabel="Supprimer"
                  onConfirm={() => remove.run({ id: b._id })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && <BrandDialog key={editing?._id ?? "new"} open={open} onOpenChange={setOpen} brand={editing} />}
    </div>
  );
}

export default function BrandsPage() {
  return (
    <RequirePermission perm="catalog">
      <BrandsInner />
    </RequirePermission>
  );
}
