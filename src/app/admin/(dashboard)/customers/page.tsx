"use client";

import { useState } from "react";
import Link from "next/link";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useAdminAction } from "@/hooks/use-admin-mutation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { Ban, BadgeCheck, CheckCircle2, Heart, Loader2, Search, UserRound } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { RequirePermission } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inputClass } from "@/components/shared/field";
import { useDebounced } from "@/hooks/use-debounced";
import { dateOnly, dh } from "@/lib/admin-format";

function AccountsTab() {
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 300);
  const accounts = useQuery(api.customers.accounts, { search: q || undefined });
  const setActive = useAdminAction(api.customers.setAccountActive, { success: "Compte mis à jour" });
  return (
    <div>
      <div className="mb-4 relative">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, e-mail, téléphone…" className={`${inputClass} ps-9`} />
      </div>
      <div className="overflow-hidden rounded-2xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>Compte</TableHead>
              <TableHead className="hidden md:table-cell">Inscrit le</TableHead>
              <TableHead className="text-end">Commandes</TableHead>
              <TableHead className="hidden text-end sm:table-cell">Total achats</TableHead>
              <TableHead className="hidden text-end lg:table-cell">Envies</TableHead>
              <TableHead className="text-end">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts === undefined && Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>)}
            {accounts?.length === 0 && <TableRow><TableCell colSpan={6} className="py-16 text-center text-muted-foreground">Aucun compte client pour le moment.</TableCell></TableRow>}
            {accounts?.map((a) => (
              <TableRow key={a._id} className={cn(!a.isActive && "opacity-60")}>
                <TableCell>
                  {a.customerId ? (
                    <Link href={`/admin/customers/${a.customerId}`} className="font-medium hover:text-primary">{a.name || a.email}</Link>
                  ) : (
                    <span className="font-medium">{a.name || a.email}</span>
                  )}
                  <p className="text-xs text-muted-foreground">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{dateOnly(a.createdAt)}</TableCell>
                <TableCell className="text-end tabular-nums">{a.orderCount}</TableCell>
                <TableCell className="hidden text-end font-semibold tabular-nums sm:table-cell">{dh(a.totalSpent)}</TableCell>
                <TableCell className="hidden text-end tabular-nums lg:table-cell"><Heart className="me-1 inline size-3.5 text-muted-foreground" />{a.wishlistCount}</TableCell>
                <TableCell className="text-end">
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant={a.isActive ? "outline" : "default"} className="rounded-lg">
                        {a.isActive ? <><BadgeCheck className="size-3.5 text-emerald-600" /> Actif</> : <><CheckCircle2 className="size-3.5" /> Réactiver</>}
                      </Button>
                    }
                    title={a.isActive ? "Désactiver ce compte ?" : "Réactiver ce compte ?"}
                    description={a.isActive ? "Le client sera déconnecté et ne pourra plus se connecter ni commander avec ce compte." : "Le client pourra de nouveau se connecter."}
                    destructive={a.isActive}
                    onConfirm={() => setActive.run({ userId: a._id, isActive: !a.isActive })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CustomersInner() {
  const [tab, setTab] = useState<"customers" | "accounts">("customers");
  return (
    <div>
      <PageHeader title="Clients" description="Clients des commandes (identifiés par téléphone) et comptes créés sur la boutique." />
      <div className="mb-4 inline-grid grid-cols-2 rounded-xl bg-secondary p-1">
        {([["customers", "Clients (commandes)"], ["accounts", "Comptes clients"]] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={cn("flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold", tab === key ? "bg-white shadow-sm" : "text-muted-foreground")}>
            {key === "accounts" && <UserRound className="size-4" />} {label}
          </button>
        ))}
      </div>
      {tab === "customers" ? <OrderCustomers /> : <AccountsTab />}
    </div>
  );
}

function OrderCustomers() {
  const [search, setSearch] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(false);
  const q = useDebounced(search, 300);
  const { results, status, loadMore } = usePaginatedQuery(api.customers.adminList, { search: q || undefined, blockedOnly: blockedOnly || undefined }, { initialNumItems: 25 });

  return (
    <div>
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
                    {c.userId && <UserRound className="ms-1 inline size-3.5 text-primary" aria-label="Compte client" />}
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
