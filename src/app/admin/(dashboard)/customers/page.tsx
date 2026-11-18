"use client";

import { useState } from "react";
import Link from "next/link";
import { usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Ban, Loader2, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { RequirePermission } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inputClass } from "@/components/shared/field";
import { useDebounced } from "@/hooks/use-debounced";
import { dateOnly, dh } from "@/lib/admin-format";

function CustomersInner() {
  const [search, setSearch] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(false);
  const q = useDebounced(search, 300);
  const { results, status, loadMore } = usePaginatedQuery(api.customers.adminList, { search: q || undefined, blockedOnly: blockedOnly || undefined }, { initialNumItems: 25 });

  return (
    <div>
      <PageHeader title="Clients" description="Clients créés automatiquement à chaque commande (identifiés par téléphone)." />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, téléphone, e-mail, ville…" className={`${inputClass} ps-9`} />
        </div>
        <label className="flex items-center gap-2 rounded-xl border bg-white px-4 text-sm">
          <input type="checkbox" checked={blockedOnly} onChange={(e) => setBlockedOnly(e.target.checked)} /> Bloqués uniquement
        </label>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">Ville</TableHead>
              <TableHead className="text-end">Commandes</TableHead>
              <TableHead className="text-end">Total achats</TableHead>
              <TableHead className="hidden lg:table-cell">Dernière commande</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === "LoadingFirstPage" && Array.from({ length: 6 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10" /></TableCell></TableRow>)}
            {status !== "LoadingFirstPage" && results.length === 0 && <TableRow><TableCell colSpan={5} className="py-16 text-center text-muted-foreground">Aucun client.</TableCell></TableRow>}
            {results.map((c) => (
              <TableRow key={c._id}>
                <TableCell>
                  <Link href={`/admin/customers/${c._id}`} className="font-medium hover:text-primary">
                    {c.fullName} {c.isBlocked && <Ban className="inline size-3.5 text-destructive" />}
                  </Link>
                  <p className="text-xs text-muted-foreground">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
                </TableCell>
                <TableCell className="hidden md:table-cell">{c.city}</TableCell>
                <TableCell className="text-end tabular-nums">{c.totalOrders}</TableCell>
                <TableCell className="text-end font-semibold tabular-nums">{dh(c.totalSpent)}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{c.lastOrderAt ? dateOnly(c.lastOrderAt) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {status === "CanLoadMore" && <div className="border-t p-3 text-center"><Button variant="outline" onClick={() => loadMore(25)}>Charger plus</Button></div>}
        {status === "LoadingMore" && <div className="border-t p-3 text-center"><Loader2 className="mx-auto size-5 animate-spin" /></div>}
      </div>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <RequirePermission perm="customers">
      <CustomersInner />
    </RequirePermission>
  );
}
