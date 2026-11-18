"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CopyPlus, ImageOff, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import type { RemoteProduct } from "@convex/electrodarna";
import { PageHeader } from "@/components/admin/page-header";
import { CategorySelect } from "@/components/admin/category-select";
import { RequirePermission } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inputClass } from "@/components/shared/field";
import { useAdminAction } from "@/hooks/use-admin-mutation";
import { dateTime, dh } from "@/lib/admin-format";
import { errorMessage } from "@/lib/convex-errors";
import { revalidateStorefront } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

type Filter = "all" | "available" | "new" | "imported";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "available", label: "Disponibles" },
  { key: "new", label: "Pas encore clonés" },
  { key: "imported", label: "Déjà clonés" },
];

const MAX_PER_IMPORT = 50;

function ElectroDarnaInner() {
  const fetchCatalog = useAction(api.electrodarna.catalog);
  const linkedList = useQuery(api.electrodarna.linked);
  const importProducts = useAdminAction(api.electrodarna.importProducts);
  const syncNow = useAdminAction(api.electrodarna.syncNow);

  const [products, setProducts] = useState<RemoteProduct[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("available");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [categoryId, setCategoryId] = useState("");

  const load = useCallback(() => {
    fetchCatalog({})
      .then(setProducts)
      .catch((e) => setLoadError(errorMessage(e, "Impossible de joindre Electro Darna pour le moment. Réessayez plus tard.")));
  }, [fetchCatalog]);

  useEffect(load, [load]);
  const retry = () => {
    setLoadError(null);
    load();
  };

  const linked = useMemo(() => new Map((linkedList ?? []).map((l) => [l.sourceId, l])), [linkedList]);
  const lastSync = (linkedList ?? []).reduce<number | null>((max, l) => (l.sourceSyncedAt && (!max || l.sourceSyncedAt > max) ? l.sourceSyncedAt : max), null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (products ?? []).filter((p) => {
      if (filter === "available" && !p.available) return false;
      if (filter === "new" && linked.has(p.id)) return false;
      if (filter === "imported" && !linked.has(p.id)) return false;
      if (!needle) return true;
      return [p.name, p.brand, p.categoryName].some((v) => v?.toLowerCase().includes(needle));
    });
  }, [products, linked, q, filter]);

  const selectable = rows.filter((p) => !linked.has(p.id));
  const allSelected = selectable.length > 0 && selectable.every((p) => selected.has(p.id));

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const clone = async (ids: string[]) => {
    if (!categoryId) {
      toast.error("Choisissez d'abord une catégorie par défaut.");
      return;
    }
    if (ids.length > MAX_PER_IMPORT) {
      toast.error(`${MAX_PER_IMPORT} produits maximum par clonage.`);
      return;
    }
    const res = await importProducts.run({ ids, status, fallbackCategoryId: categoryId as Id<"categories"> });
    if (!res) return;
    toast.success(`${res.created} produit(s) cloné(s)${res.skipped ? `, ${res.skipped} déjà présent(s)` : ""}`);
    if (res.failed.length) toast.error(`Échec : ${res.failed.join(", ")}`);
    setSelected(new Set());
    revalidateStorefront().catch(() => {});
  };

  const sync = async () => {
    const res = await syncNow.run({});
    if (!res) return;
    toast.success(`${res.checked} produit(s) vérifié(s), ${res.updated} mis à jour, ${res.outOfStock} en rupture`);
    revalidateStorefront().catch(() => {});
  };

  const busy = importProducts.pending;

  return (
    <div>
      <PageHeader
        title="Electro Darna"
        description="Produits disponibles chez Electro Darna. Clonez-les dans votre catalogue : leur stock est ensuite synchronisé automatiquement (toutes les 15 min)."
        actions={
          <div className="flex items-center gap-3">
            {lastSync && <span className="text-xs text-muted-foreground">Dernière synchro : {dateTime(lastSync)}</span>}
            <Button variant="outline" className="rounded-lg" disabled={syncNow.pending || !linkedList?.length} onClick={() => void sync()}>
              {syncNow.pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Synchroniser le stock
            </Button>
          </div>
        }
      />

      {loadError ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm text-muted-foreground">
          <p>{loadError}</p>
          <Button variant="outline" className="mt-4 rounded-lg" onClick={retry}>Réessayer</Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, marque, catégorie…" className={`${inputClass} h-10 ps-9`} />
            </div>
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", filter === f.key ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-secondary")}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 grid gap-2 rounded-2xl border bg-white p-3 text-sm sm:grid-cols-[1fr_220px_180px_auto] sm:items-center">
            <span className="text-muted-foreground">
              {rows.length} produit(s) · {linked.size} déjà cloné(s){selected.size ? ` · ${selected.size} sélectionné(s)` : ""}
            </span>
            <div title="Utilisée quand la catégorie Electro Darna n'existe pas chez vous">
              <CategorySelect value={categoryId} onChange={setCategoryId} emptyLabel="— Catégorie par défaut —" className={`${inputClass} h-10`} />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")} className={`${inputClass} h-10`}>
              <option value="draft">Cloner en brouillon</option>
              <option value="published">Cloner et publier</option>
            </select>
            <Button className="rounded-lg" disabled={busy || selected.size === 0} onClick={() => void clone([...selected])}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CopyPlus className="size-4" />} Cloner la sélection
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 ps-5">
                    <Checkbox
                      checked={allSelected}
                      disabled={selectable.length === 0}
                      onCheckedChange={(v) => setSelected(v ? new Set(selectable.slice(0, MAX_PER_IMPORT).map((p) => p.id)) : new Set())}
                      aria-label="Tout sélectionner"
                    />
                  </TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Prix Electro Darna</TableHead>
                  <TableHead>Disponibilité</TableHead>
                  <TableHead className="pe-5 text-end" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products === null
                  ? Array.from({ length: 6 }, (_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="px-5"><Skeleton className="h-10 w-full" /></TableCell>
                      </TableRow>
                    ))
                  : rows.map((p) => {
                      const local = linked.get(p.id);
                      return (
                        <TableRow key={p.id} className={cn(!p.isActive && "opacity-60")}>
                          <TableCell className="ps-5">
                            <Checkbox checked={selected.has(p.id)} disabled={Boolean(local)} onCheckedChange={(v) => toggle(p.id, v === true)} aria-label={`Sélectionner ${p.name}`} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white">
                                {p.imageUrls[0] ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- remote Convex storage URL
                                  <img src={p.imageUrls[0]} alt="" loading="lazy" className="size-full object-contain p-0.5" />
                                ) : (
                                  <ImageOff className="size-4 text-muted-foreground" />
                                )}
                              </span>
                              <span className="min-w-0">
                                <span className="line-clamp-1 font-medium">{p.name}</span>
                                <span className="text-xs text-muted-foreground">{[p.brand, p.categoryName].filter(Boolean).join(" · ") || "—"}</span>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {dh(p.price)}
                            {local && local.price !== p.price ? <span className="block text-xs text-muted-foreground">Chez vous : {dh(local.price)}</span> : null}
                          </TableCell>
                          <TableCell>
                            {!p.isActive ? (
                              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">Désactivé</span>
                            ) : p.available ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">{p.stock != null ? `${p.stock} en stock` : "En stock"}</span>
                            ) : (
                              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-900">Rupture</span>
                            )}
                          </TableCell>
                          <TableCell className="pe-5 text-end">
                            {local ? (
                              <Button asChild variant="ghost" size="sm"><Link href={`/admin/products/${local.id}`}>Cloné · voir</Link></Button>
                            ) : (
                              <Button variant="outline" size="sm" disabled={busy} onClick={() => void clone([p.id])}><CopyPlus className="size-4" /> Cloner</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                {products !== null && rows.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Aucun produit.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

export default function ElectroDarnaPage() {
  return (
    <RequirePermission perm="catalog">
      <ElectroDarnaInner />
    </RequirePermission>
  );
}
