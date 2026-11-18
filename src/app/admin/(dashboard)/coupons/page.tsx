"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { RequirePermission } from "@/components/admin/admin-shell";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { dateOnly, dh, fromDateInput, toDateInput } from "@/lib/admin-format";

type Coupon = Doc<"coupons">;

function CouponDialog({ coupon, open, onOpenChange }: { coupon: Coupon | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [f, setF] = useState({
    code: coupon?.code ?? "",
    descriptionFr: coupon?.descriptionFr ?? "",
    type: coupon?.type ?? ("percentage" as "percentage" | "fixed"),
    value: coupon?.value?.toString() ?? "",
    minOrderAmount: coupon?.minOrderAmount?.toString() ?? "",
    maxDiscount: coupon?.maxDiscount?.toString() ?? "",
    startsAt: toDateInput(coupon?.startsAt),
    expiresAt: toDateInput(coupon?.expiresAt),
    usageLimit: coupon?.usageLimit?.toString() ?? "",
    isActive: coupon?.isActive ?? true,
  });
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  const create = useAdminMutation(api.coupons.create, { success: "Code promo créé", revalidate: false });
  const update = useAdminMutation(api.coupons.update, { success: "Code promo enregistré", revalidate: false });
  const n = (s: string) => (s.trim() ? Number(s) : undefined);
  const pending = create.pending || update.pending;

  const submit = async () => {
    const payload = {
      code: f.code,
      descriptionFr: f.descriptionFr || undefined,
      type: f.type,
      value: Number(f.value),
      minOrderAmount: n(f.minOrderAmount),
      maxDiscount: n(f.maxDiscount),
      startsAt: fromDateInput(f.startsAt),
      expiresAt: fromDateInput(f.expiresAt, true),
      usageLimit: n(f.usageLimit),
      isActive: f.isActive,
    };
    if (coupon) {
      const r = await update.run({ id: coupon._id, ...payload });
      if (r !== undefined) onOpenChange(false);
    } else if (await create.run(payload)) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>{coupon ? "Modifier le code promo" : "Nouveau code promo"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" required hint="Lettres, chiffres, - et _"><input className={`${inputClass} uppercase`} value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Description interne"><input className={inputClass} value={f.descriptionFr} onChange={(e) => set({ descriptionFr: e.target.value })} /></Field>
          <Field label="Type de remise">
            <select className={inputClass} value={f.type} onChange={(e) => set({ type: e.target.value as "percentage" | "fixed" })}>
              <option value="percentage">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (DH)</option>
            </select>
          </Field>
          <Field label={f.type === "percentage" ? "Valeur (%)" : "Valeur (DH)"} required><input inputMode="decimal" className={inputClass} value={f.value} onChange={(e) => set({ value: e.target.value })} /></Field>
          <Field label="Montant minimum de commande (DH)"><input inputMode="decimal" className={inputClass} value={f.minOrderAmount} onChange={(e) => set({ minOrderAmount: e.target.value })} /></Field>
          <Field label="Remise maximale (DH)"><input inputMode="decimal" className={inputClass} value={f.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} /></Field>
          <Field label="Date de début"><input type="date" className={inputClass} value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} /></Field>
          <Field label="Date d'expiration"><input type="date" className={inputClass} value={f.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} /></Field>
          <Field label="Limite d'utilisation" hint="Vide = illimité"><input inputMode="numeric" className={inputClass} value={f.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} /></Field>
          <label className="flex items-center justify-between self-end rounded-xl border p-3 text-sm font-medium">Actif <Switch checked={f.isActive} onCheckedChange={(v) => set({ isActive: v })} /></label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={pending || !f.code || !Number(f.value)}>{pending && <Loader2 className="size-4 animate-spin" />} Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CouponState({ c }: { c: Coupon }) {
  const [now] = useState(() => Date.now());
  let label = "Actif";
  let cls = "bg-emerald-100 text-emerald-800";
  if (!c.isActive) [label, cls] = ["Inactif", "bg-zinc-200 text-zinc-700"];
  else if (c.expiresAt && c.expiresAt < now) [label, cls] = ["Expiré", "bg-rose-100 text-rose-800"];
  else if (c.startsAt && c.startsAt > now) [label, cls] = ["Programmé", "bg-sky-100 text-sky-800"];
  else if (c.usageLimit !== undefined && c.usageCount >= c.usageLimit) [label, cls] = ["Épuisé", "bg-amber-100 text-amber-800"];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

function CouponsInner() {
  const coupons = useQuery(api.coupons.adminList);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);
  const toggle = useAdminMutation(api.coupons.toggle, { revalidate: false });
  const remove = useAdminMutation(api.coupons.remove, { success: "Code supprimé", revalidate: false });

  return (
    <div>
      <PageHeader title="Codes promo" description="Les codes sont validés côté serveur à chaque commande." actions={<Button className="rounded-lg" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> Nouveau code</Button>} />
      <div className="overflow-hidden rounded-2xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>Code</TableHead>
              <TableHead>Remise</TableHead>
              <TableHead className="hidden md:table-cell">Conditions</TableHead>
              <TableHead className="hidden md:table-cell">Validité</TableHead>
              <TableHead>Utilisations</TableHead>
              <TableHead>État</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!coupons && <TableRow><TableCell colSpan={7}><Skeleton className="h-10" /></TableCell></TableRow>}
            {coupons?.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Aucun code promo.</TableCell></TableRow>}
            {coupons?.map((c) => (
              <TableRow key={c._id}>
                <TableCell><p className="font-mono font-semibold">{c.code}</p>{c.descriptionFr && <p className="text-xs text-muted-foreground">{c.descriptionFr}</p>}</TableCell>
                <TableCell className="font-semibold">{c.type === "percentage" ? `${c.value} %` : dh(c.value)}</TableCell>
                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                  {c.minOrderAmount ? `Min. ${dh(c.minOrderAmount)}` : "Sans minimum"}
                  {c.maxDiscount ? ` · Max. ${dh(c.maxDiscount)}` : ""}
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                  {c.startsAt ? dateOnly(c.startsAt) : "—"} → {c.expiresAt ? dateOnly(c.expiresAt) : "∞"}
                </TableCell>
                <TableCell className="tabular-nums">{c.usageCount}{c.usageLimit !== undefined ? ` / ${c.usageLimit}` : ""}</TableCell>
                <TableCell><CouponState c={c} /></TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Switch checked={c.isActive} onCheckedChange={(v) => toggle.run({ id: c._id, isActive: v })} aria-label="Actif" />
                    <button type="button" onClick={() => { setEditing(c); setOpen(true); }} className="grid size-8 place-items-center rounded-lg hover:bg-secondary" aria-label="Modifier"><Pencil className="size-4" /></button>
                    <ConfirmDialog trigger={<button type="button" className="grid size-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10" aria-label="Supprimer"><Trash2 className="size-4" /></button>} title={`Supprimer ${c.code} ?`} confirmLabel="Supprimer" onConfirm={() => remove.run({ id: c._id })} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {open && <CouponDialog key={editing?._id ?? "new"} coupon={editing} open={open} onOpenChange={setOpen} />}
    </div>
  );
}

export default function CouponsPage() {
  return (
    <RequirePermission perm="coupons">
      <CouponsInner />
    </RequirePermission>
  );
}
