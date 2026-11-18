"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, History, Loader2, PackageX, Search, SlidersHorizontal, Wallet } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { StockBadge } from "@/components/admin/status";
import { RequirePermission } from "@/components/admin/admin-shell";
import { ProductImage } from "@/components/store/product-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field, inputClass } from "@/components/shared/field";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { dateTime, dh } from "@/lib/admin-format";
import { cn } from "@/lib/utils";

type Row = FunctionReturnType<typeof api.inventory.overview>["rows"][number];
type Filter = "all" | "low" | "out";

const REASON_LABELS: Record<string, string> = {
  initial: "Stock initial",
  sale: "Vente",
  cancel: "Commande annulée",
  reactivate: "Commande réactivée",
  adjust: "Correction",
  restock: "Réapprovisionnement",
  loss: "Perte / casse",
  import: "Import Electro Darna",
  sync: "Synchro Electro Darna",
};

function Stat({ icon: Icon, label, value, hint, tone }: { icon: typeof Boxes; label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={cn("size-4", tone)} /> {label}
      </p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", tone)}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function AdjustDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const adjust = useAdminMutation(api.inventory.adjust, { success: "Stock mis à jour" });
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<"restock" | "loss" | "adjust">("restock");
  const [note, setNote] = useState("");
  const n = Number(qty);
  const valid = qty !== "" && Number.isInteger(n) && n >= 0;
  const after = !valid ? row.stock : mode === "set" ? n : mode === "add" ? row.stock + n : row.stock - n;

  const pickMode = (m: typeof mode) => {
    setMode(m);
    setReason(m === "add" ? "restock" : m === "remove" ? "loss" : "adjust");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajuster le stock</DialogTitle>
          <DialogDescription className="line-clamp-2">{row.nameFr}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
            {([["add", "Ajouter"], ["remove", "Retirer"], ["set", "Fixer à"]] as const).map(([m, label]) => (
              <button key={m} type="button" onClick={() => pickMode(m)} className={cn("h-9 rounded-lg text-sm font-semibold", mode === m ? "bg-white shadow-sm" : "text-muted-foreground")}>
                {label}
              </button>
            ))}
          </div>
          <Field label="Quantité" htmlFor="adj-qty">
            <input id="adj-qty" autoFocus inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Motif" htmlFor="adj-reason">
            <select id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className={inputClass}>
              <option value="restock">Réapprovisionnement</option>
              <option value="loss">Perte / casse</option>
              <option value="adjust">Correction d&apos;inventaire</option>
            </select>
          </Field>
          <Field label="Note (facultatif)" htmlFor="adj-note">
            <input id="adj-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fournisseur, n° de bon…" className={inputClass} />
          </Field>
          <p className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
            Stock : <b className="tabular-nums">{row.stock}</b> → <b className={cn("tabular-nums", after < 0 && "text-destructive")}>{after}</b>
          </p>
          {row.linked && <p className="text-xs text-amber-700">Produit lié à Electro Darna : la prochaine synchro (15 min) remplacera ce stock.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={!valid || after < 0 || adjust.pending}
            onClick={async () => {
              const res = await adjust.run({ productId: row._id, mode, quantity: n, reason, note: note || undefined });
              if (res !== undefined) onClose();
            }}
          >
            {adjust.pending && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Movements({ productId, title }: { productId?: Id<"products">; title: string }) {
  const rows = useQuery(api.inventory.movements, { productId, limit: 60 });
  return (
    <Panel title={title} description="Chaque changement de stock : ventes, annulations, ajustements, synchro.">
      {rows === undefined ? (
        <Skeleton className="h-40" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun mouvement enregistré.</p>
      ) : (
        <ul className="-my-2 max-h-[560px] divide-y overflow-y-auto">
          {rows.map((m) => (
            <li key={m._id} className="flex items-start gap-3 py-2.5 text-sm">
              <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", m.delta > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                {m.delta > 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                {!productId && <p className="truncate font-medium">{m.productName}</p>}
                <p className="text-muted-foreground">
                  {REASON_LABELS[m.reason] ?? m.reason}
                  {m.note ? ` · ${m.note}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateTime(m._creationTime)}
                  {m.userName ? ` · ${m.userName}` : ""}
                </p>
              </div>
              <div className="text-end">
                <p className={cn("font-bold tabular-nums", m.delta > 0 ? "text-emerald-700" : "text-rose-700")}>
                  {m.delta > 0 ? "+" : ""}
                  {m.delta}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">→ {m.stockAfter}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function InventoryInner() {
  const data = useQuery(api.inventory.overview);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [adjusting, setAdjusting] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.rows ?? []).filter((r) => {
      if (filter !== "all" && r.state !== filter) return false;
      return !needle || r.nameFr.toLowerCase().includes(needle) || r.sku.toLowerCase().includes(needle);
    });
  }, [data, filter, q]);

  if (data === undefined) return <Skeleton className="h-[600px] rounded-2xl" />;
  const { totals } = data;

  return (
    <div>
      <PageHeader title="Inventaire" description="Niveaux de stock, alertes et historique de tous les mouvements." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Boxes} label="Unités en stock" value={totals.units.toLocaleString("fr-FR")} hint={`${totals.products} produits actifs`} />
        <Stat icon={Wallet} label="Valeur (prix d'achat)" value={dh(totals.costValue)} hint={totals.missingCost ? `${totals.missingCost} produit(s) sans prix d'achat` : `Valeur de vente : ${dh(totals.retailValue)}`} />
        <Stat icon={AlertTriangle} label="Stock faible" value={String(totals.low)} tone="text-amber-600" />
        <Stat icon={PackageX} label="En rupture" value={String(totals.out)} tone="text-rose-600" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou SKU…" className={`${inputClass} h-10 ps-9`} />
            </div>
            {([["all", "Tous"], ["low", `Stock faible (${totals.low})`], ["out", `Rupture (${totals.out})`]] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", filter === key ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-secondary")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-5">Produit</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="hidden md:table-cell">Seuil</TableHead>
                  <TableHead className="hidden md:table-cell">Vendus</TableHead>
                  <TableHead className="hidden lg:table-cell">Valeur</TableHead>
                  <TableHead className="pe-5 text-end" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id} className={cn("cursor-pointer", selected?._id === r._id && "bg-accent/50")} onClick={() => setSelected(selected?._id === r._id ? null : r)}>
                    <TableCell className="ps-5">
                      <div className="flex items-center gap-3">
                        <ProductImage image={r.image} alt="" sizes="40px" className="size-10 shrink-0 rounded-lg border" imgClassName="p-0.5" />
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-medium">{r.nameFr}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.sku}
                            {r.linked && " · Electro Darna"}
                            {r.status !== "published" && " · brouillon"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><StockBadge stock={r.stock} min={r.minStockAlert} /></TableCell>
                    <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">{r.minStockAlert}</TableCell>
                    <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">{r.salesCount}</TableCell>
                    <TableCell className="hidden tabular-nums lg:table-cell">{r.purchasePrice !== null ? dh(Math.max(0, r.stock) * r.purchasePrice) : "—"}</TableCell>
                    <TableCell className="pe-5 text-end">
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={(e) => { e.stopPropagation(); setAdjusting(r); }}>
                        <SlidersHorizontal className="size-3.5" /> Ajuster
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Aucun produit.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="space-y-3">
          {selected && (
            <div className="flex items-center justify-between rounded-xl bg-accent/60 px-4 py-2 text-sm">
              <span className="truncate">Historique : <b>{selected.nameFr}</b></span>
              <Link href={`/admin/products/${selected._id}`} className="shrink-0 font-semibold text-primary hover:underline">Fiche</Link>
            </div>
          )}
          <Movements key={selected?._id ?? "all"} productId={selected?._id} title={selected ? "Mouvements du produit" : "Derniers mouvements"} />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><History className="size-3.5" /> Cliquez sur un produit pour voir son historique.</p>
        </div>
      </div>
      {adjusting && <AdjustDialog row={adjusting} onClose={() => setAdjusting(null)} />}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <RequirePermission perm="catalog">
      <InventoryInner />
    </RequirePermission>
  );
}
