"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Copy, Eye, EyeOff, ImageOff, Loader2, MoreHorizontal, Pencil, Plus, Search, Star, Trash2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProductStatusBadge, StockBadge } from "@/components/admin/status";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { CategorySelect } from "@/components/admin/category-select";
import { RequirePermission } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { useDebounced } from "@/hooks/use-debounced";
import { dh } from "@/lib/admin-format";
import { inputClass } from "@/components/shared/field";
import { cn } from "@/lib/utils";

type Status = "published" | "draft" | "archived";

function StockCell({ id, stock, min }: { id: Id<"products">; stock: number; min: number }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(stock));
  const save = useAdminMutation(api.products.quickUpdate, { success: "Stock mis à jour" });
  if (!editing) {
    return (
      <button type="button" onClick={() => { setValue(String(stock)); setEditing(true); }} className="rounded px-1.5 py-0.5 hover:bg-secondary" title="Modifier le stock">
        <StockBadge stock={stock} min={min} />
      </button>
    );
  }
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={async (e) => {
        e.preventDefault();
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0) return;
        await save.run({ id, stock: n });
        setEditing(false);
      }}
    >
      <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => !save.pending && setEditing(false)} onKeyDown={(e) => e.key === "Escape" && setEditing(false)} className="h-7 w-16 rounded border px-1.5 text-sm" inputMode="numeric" />
      {save.pending && <Loader2 className="size-3.5 animate-spin" />}
    </form>
  );
}

function ProductsPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [stock, setStock] = useState<"" | "low" | "out">((sp.get("stock") as "low" | "out") ?? "");
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>({ key: "", ids: new Set() });
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [discount, setDiscount] = useState("");
  const q = useDebounced(search, 300);

  const { results, status: loadStatus, loadMore } = usePaginatedQuery(
    api.products.adminList,
    {
      search: q || undefined,
      status: status || undefined,
      categoryId: (categoryId || undefined) as Id<"categories"> | undefined,
      stock: stock || undefined,
    },
    { initialNumItems: 25 },
  );

  // Selection is scoped to the current filters: changing filters clears it.
  const filterKey = JSON.stringify([q, status, categoryId, stock]);
  const selected = selection.key === filterKey ? selection.ids : new Set<string>();
  const setSelected = (next: Set<string> | ((s: Set<string>) => Set<string>)) =>
    setSelection((cur) => {
      const base = cur.key === filterKey ? cur.ids : new Set<string>();
      return { key: filterKey, ids: typeof next === "function" ? next(base) : next };
    });

  const quick = useAdminMutation(api.products.quickUpdate);
  const duplicate = useAdminMutation(api.products.duplicate, { success: "Produit dupliqué (brouillon)" });
  const remove = useAdminMutation(api.products.remove, { success: "Produit supprimé" });
  const bulkUpdate = useAdminMutation(api.products.bulkUpdate, { success: "Produits mis à jour" });
  const bulkDelete = useAdminMutation(api.products.bulkDelete, { success: "Produits supprimés" });

  const ids = [...selected] as Id<"products">[];
  const allSelected = results.length > 0 && results.every((r) => selected.has(r._id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(results.map((r) => r._id)));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const bulk = async (patch: Parameters<typeof bulkUpdate.run>[0]["patch"]) => {
    await bulkUpdate.run({ ids, patch });
    setSelected(new Set());
  };

  return (
    <div>
      <PageHeader
        title="Produits"
        description="Gérez votre catalogue, vos prix et vos stocks."
        actions={
          <Button asChild className="rounded-lg">
            <Link href="/admin/products/new">
              <Plus className="size-4" /> Ajouter un produit
            </Link>
          </Button>
        }
      />
      <div className="mb-4 grid gap-2 rounded-2xl border bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_220px_170px]">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, SKU, marque…)" className={`${inputClass} h-10 ps-9`} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as Status | "")} className={`${inputClass} h-10`}>
          <option value="">Tous les statuts</option>
          <option value="published">Publiés</option>
          <option value="draft">Brouillons</option>
          <option value="archived">Archivés</option>
        </select>
        <CategorySelect value={categoryId} onChange={setCategoryId} allowEmpty emptyLabel="Toutes les catégories" className={`${inputClass} h-10`} />
        <select value={stock} onChange={(e) => setStock(e.target.value as "" | "low" | "out")} className={`${inputClass} h-10`}>
          <option value="">Tous les stocks</option>
          <option value="low">Stock faible</option>
          <option value="out">Rupture</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <span className="me-2 font-semibold">{selected.size} sélectionné(s)</span>
          <Button size="sm" variant="outline" onClick={() => bulk({ status: "published" })}>Publier</Button>
          <Button size="sm" variant="outline" onClick={() => bulk({ status: "draft" })}>Dépublier</Button>
          <Button size="sm" variant="outline" onClick={() => bulk({ isFeatured: true })}>Mettre en avant</Button>
          <Button size="sm" variant="outline" onClick={() => bulk({ isFeatured: false })}>Retirer la mise en avant</Button>
          <Button size="sm" variant="outline" onClick={() => bulk({ isBestSeller: true })}>Meilleure vente</Button>
          <span className="flex items-center gap-1">
            <input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="%" className="h-7 w-14 rounded-md border px-2" inputMode="numeric" />
            <Button size="sm" variant="outline" disabled={!Number(discount)} onClick={() => bulk({ discountPercent: Number(discount) }).then(() => setDiscount(""))}>
              Appliquer remise
            </Button>
          </span>
          <Button size="sm" variant="outline" onClick={() => bulk({ clearDiscount: true })}>Retirer remise</Button>
          <Button size="sm" variant="destructive" onClick={() => setConfirmBulkDelete(true)}>
            <Trash2 className="size-3.5" /> Supprimer
          </Button>
          <ConfirmDialog
            open={confirmBulkDelete}
            onOpenChange={setConfirmBulkDelete}
            title={`Supprimer ${selected.size} produit(s) ?`}
            description="Cette action est définitive. Les images non utilisées seront supprimées de Cloudinary."
            confirmLabel="Supprimer"
            onConfirm={async () => {
              await bulkDelete.run({ ids });
              setSelected(new Set());
            }}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Tout sélectionner" />
              </TableHead>
              <TableHead>Produit</TableHead>
              <TableHead className="hidden md:table-cell">Catégorie</TableHead>
              <TableHead className="text-end">Prix</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="hidden sm:table-cell">Statut</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadStatus === "LoadingFirstPage" &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-10" /></TableCell>
                </TableRow>
              ))}
            {loadStatus !== "LoadingFirstPage" && results.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                  Aucun produit trouvé.
                </TableCell>
              </TableRow>
            )}
            {results.map((p) => (
              <TableRow key={p._id} className={cn(selected.has(p._id) && "bg-primary/5")}>
                <TableCell>
                  <Checkbox checked={selected.has(p._id)} onCheckedChange={() => toggle(p._id)} aria-label="Sélectionner" />
                </TableCell>
                <TableCell>
                  <Link href={`/admin/products/${p._id}`} className="flex items-center gap-3">
                    <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border bg-white">
                      {p.image ? <Image src={p.image.url} alt="" fill sizes="44px" className="object-contain p-0.5" /> : <ImageOff className="size-4 text-muted-foreground" />}
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-1 max-w-[280px] font-medium hover:text-primary">{p.nameFr}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {p.sku}
                        {p.isFeatured && <Star className="size-3 fill-amber-400 text-amber-400" />}
                        {p.isBestSeller && <TrendingUp className="size-3 text-primary" />}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{p.categoryName}</TableCell>
                <TableCell className="text-end text-sm tabular-nums">
                  <span className="font-semibold">{dh(p.price)}</span>
                  {p.oldPrice && <span className="block text-xs text-muted-foreground line-through">{dh(p.oldPrice)}</span>}
                </TableCell>
                <TableCell><StockCell id={p._id} stock={p.stock} min={p.minStockAlert} /></TableCell>
                <TableCell className="hidden sm:table-cell"><ProductStatusBadge status={p.status} /></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-secondary" aria-label="Actions">
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/admin/products/${p._id}`)}><Pencil className="size-4" /> Modifier</DropdownMenuItem>
                      <DropdownMenuItem onClick={async () => { const id = await duplicate.run({ id: p._id }); if (id) router.push(`/admin/products/${id}`); }}>
                        <Copy className="size-4" /> Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => quick.run({ id: p._id, status: p.status === "published" ? "draft" : "published" }, { success: p.status === "published" ? "Produit dépublié" : "Produit publié" })}>
                        {p.status === "published" ? <><EyeOff className="size-4" /> Dépublier</> : <><Eye className="size-4" /> Publier</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => quick.run({ id: p._id, isFeatured: !p.isFeatured })}><Star className="size-4" /> {p.isFeatured ? "Retirer la mise en avant" : "Mettre en avant"}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => quick.run({ id: p._id, isBestSeller: !p.isBestSeller })}><TrendingUp className="size-4" /> {p.isBestSeller ? "Retirer des meilleures ventes" : "Meilleure vente"}</DropdownMenuItem>
                      {p.status === "published" && (
                        <DropdownMenuItem onClick={() => window.open(`/fr/product/${p.slug}`, "_blank")}><Eye className="size-4" /> Voir sur la boutique</DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <ConfirmDialog
                        trigger={
                          <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="size-4" /> Supprimer
                          </DropdownMenuItem>
                        }
                        title="Supprimer ce produit ?"
                        description={`« ${p.nameFr} » sera définitivement supprimé.`}
                        confirmLabel="Supprimer"
                        onConfirm={() => remove.run({ id: p._id })}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loadStatus === "CanLoadMore" && (
          <div className="border-t p-3 text-center">
            <Button variant="outline" onClick={() => loadMore(25)}>Charger plus</Button>
          </div>
        )}
        {loadStatus === "LoadingMore" && (
          <div className="border-t p-3 text-center"><Loader2 className="mx-auto size-5 animate-spin" /></div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <RequirePermission perm="catalog">
      <ProductsPageInner />
    </RequirePermission>
  );
}
