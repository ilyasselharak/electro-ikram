"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { ArrowDown, ArrowUp, ImageOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { RequirePermission } from "@/components/admin/admin-shell";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { SingleImageUpload } from "@/components/admin/image-uploader";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { dateOnly, fromDateInput, toDateInput } from "@/lib/admin-format";
import type { ImageAsset } from "@/lib/cloudinary";

type Banner = Doc<"banners">;
type Placement = Banner["placement"];

function BannerDialog({ banner, placement, open, onOpenChange }: { banner: Banner | null; placement: Placement; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [f, setF] = useState({
    titleFr: banner?.titleFr ?? "",
    titleAr: banner?.titleAr ?? "",
    subtitleFr: banner?.subtitleFr ?? "",
    subtitleAr: banner?.subtitleAr ?? "",
    ctaFr: banner?.ctaFr ?? "",
    ctaAr: banner?.ctaAr ?? "",
    link: banner?.link ?? "",
    image: banner?.image as ImageAsset | undefined,
    mobileImage: banner?.mobileImage as ImageAsset | undefined,
    theme: banner?.theme ?? ("dark" as "dark" | "light"),
    isActive: banner?.isActive ?? true,
    startsAt: toDateInput(banner?.startsAt),
    endsAt: toDateInput(banner?.endsAt),
  });
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  const create = useAdminMutation(api.homepage.createBanner, { success: "Bannière créée" });
  const update = useAdminMutation(api.homepage.updateBanner, { success: "Bannière enregistrée" });
  const pending = create.pending || update.pending;

  const submit = async () => {
    const payload = { ...f, placement, startsAt: fromDateInput(f.startsAt), endsAt: fromDateInput(f.endsAt, true) };
    const r = banner ? await update.run({ id: banner._id, ...payload }) : await create.run(payload);
    if (r !== undefined) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{banner ? "Modifier la bannière" : `Nouvelle bannière ${placement === "hero" ? "principale" : "promotionnelle"}`}</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-[1fr_200px]">
          <Field label="Image (bureau)" required hint={placement === "hero" ? "1920 × 720 recommandé" : "1200 × 675 recommandé"}>
            <SingleImageUpload folder="banners" value={f.image} onChange={(image) => set({ image })} aspect={placement === "hero" ? "aspect-[16/6]" : "aspect-video"} />
          </Field>
          <Field label="Image mobile" hint="Optionnel · 800 × 1000">
            <SingleImageUpload folder="banners" value={f.mobileImage} onChange={(mobileImage) => set({ mobileImage })} aspect="aspect-[4/5]" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre (FR)"><input className={inputClass} value={f.titleFr} onChange={(e) => set({ titleFr: e.target.value })} /></Field>
          <Field label="Titre (AR)"><input className={inputClass} dir="rtl" value={f.titleAr} onChange={(e) => set({ titleAr: e.target.value })} /></Field>
          <Field label="Sous-titre (FR)"><input className={inputClass} value={f.subtitleFr} onChange={(e) => set({ subtitleFr: e.target.value })} /></Field>
          <Field label="Sous-titre (AR)"><input className={inputClass} dir="rtl" value={f.subtitleAr} onChange={(e) => set({ subtitleAr: e.target.value })} /></Field>
          <Field label="Bouton (FR)"><input className={inputClass} value={f.ctaFr} onChange={(e) => set({ ctaFr: e.target.value })} placeholder="Découvrir" /></Field>
          <Field label="Bouton (AR)"><input className={inputClass} dir="rtl" value={f.ctaAr} onChange={(e) => set({ ctaAr: e.target.value })} placeholder="اكتشف" /></Field>
          <Field label="Lien" hint="Ex. : /category/climatiseurs ou /offers (sans préfixe de langue)" className="sm:col-span-2"><input className={inputClass} value={f.link} onChange={(e) => set({ link: e.target.value })} /></Field>
          <Field label="Style du texte">
            <select className={inputClass} value={f.theme} onChange={(e) => set({ theme: e.target.value as "dark" | "light" })}>
              <option value="dark">Texte blanc sur dégradé sombre</option>
              <option value="light">Texte foncé (image claire)</option>
            </select>
          </Field>
          <label className="flex items-center justify-between self-end rounded-xl border p-3 text-sm font-medium">Active <Switch checked={f.isActive} onCheckedChange={(v) => set({ isActive: v })} /></label>
          <Field label="Afficher à partir du"><input type="date" className={inputClass} value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} /></Field>
          <Field label="Jusqu'au"><input type="date" className={inputClass} value={f.endsAt} onChange={(e) => set({ endsAt: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={pending || !f.image}>{pending && <Loader2 className="size-4 animate-spin" />} Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BannerList({ placement, banners, onEdit }: { placement: Placement; banners: Banner[]; onEdit: (b: Banner | null) => void }) {
  const reorder = useAdminMutation(api.homepage.reorderBanners);
  const remove = useAdminMutation(api.homepage.removeBanner, { success: "Bannière supprimée" });
  const update = useAdminMutation(api.homepage.updateBanner);
  const list = banners.filter((b) => b.placement === placement).sort((a, b) => a.order - b.order);
  const move = (i: number, dir: -1 | 1) => {
    const ids = list.map((b) => b._id);
    const t = i + dir;
    if (t < 0 || t >= ids.length) return;
    [ids[i], ids[t]] = [ids[t], ids[i]];
    reorder.run({ ids });
  };
  return (
    <Panel
      title={placement === "hero" ? "Bannières principales (carrousel)" : "Bannières promotionnelles"}
      actions={<Button size="sm" onClick={() => onEdit(null)}><Plus className="size-4" /> Ajouter</Button>}
    >
      {list.length === 0 ? <p className="text-sm text-muted-foreground">Aucune bannière.</p> : (
        <ul className="space-y-3">
          {list.map((b, i) => {
            const { _id, _creationTime, order, ...rest } = b;
            void _creationTime; void order;
            return (
              <li key={_id} className="flex items-center gap-4 rounded-xl border p-3">
                <span className="relative grid aspect-[16/7] w-40 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary">
                  {b.image ? <Image src={b.image.url} alt="" fill sizes="160px" className="object-cover" /> : <ImageOff className="size-5 text-muted-foreground" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.titleFr || "Sans titre"}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.link || "Pas de lien"}{b.startsAt || b.endsAt ? ` · ${b.startsAt ? dateOnly(b.startsAt) : "…"} → ${b.endsAt ? dateOnly(b.endsAt) : "…"}` : ""}</p>
                </div>
                <button type="button" onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-lg hover:bg-secondary" aria-label="Monter"><ArrowUp className="size-4" /></button>
                <button type="button" onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-lg hover:bg-secondary" aria-label="Descendre"><ArrowDown className="size-4" /></button>
                <Switch checked={b.isActive} onCheckedChange={(v) => update.run({ id: _id, ...rest, isActive: v })} aria-label="Active" />
                <button type="button" onClick={() => onEdit(b)} className="grid size-8 place-items-center rounded-lg hover:bg-secondary" aria-label="Modifier"><Pencil className="size-4" /></button>
                <ConfirmDialog trigger={<button type="button" className="grid size-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10" aria-label="Supprimer"><Trash2 className="size-4" /></button>} title="Supprimer cette bannière ?" confirmLabel="Supprimer" onConfirm={() => remove.run({ id: _id })} />
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function BannersInner() {
  const banners = useQuery(api.homepage.adminBanners);
  const [dialog, setDialog] = useState<{ banner: Banner | null; placement: Placement } | null>(null);
  return (
    <div>
      <PageHeader title="Bannières" description="Images du carrousel d'accueil et bannières promotionnelles, programmables par dates." />
      {!banners ? <Skeleton className="h-96 rounded-2xl" /> : (
        <div className="space-y-6">
          <BannerList placement="hero" banners={banners} onEdit={(banner) => setDialog({ banner, placement: "hero" })} />
          <BannerList placement="promo" banners={banners} onEdit={(banner) => setDialog({ banner, placement: "promo" })} />
        </div>
      )}
      {dialog && <BannerDialog key={dialog.banner?._id ?? `new-${dialog.placement}`} banner={dialog.banner} placement={dialog.placement} open onOpenChange={(o) => !o && setDialog(null)} />}
    </div>
  );
}

export default function BannersPage() {
  return (
    <RequirePermission perm="content">
      <BannersInner />
    </RequirePermission>
  );
}
