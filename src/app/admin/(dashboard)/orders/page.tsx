"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvex, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge, ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/components/admin/status";
import { RequirePermission } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, inputClass } from "@/components/shared/field";
import { useDebounced } from "@/hooks/use-debounced";
import { dateTime, dh, fromDateInput, toDateInput } from "@/lib/admin-format";
import { cn } from "@/lib/utils";

type Status = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ExportDialog() {
  const convex = useConvex();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(() => toDateInput(Date.now() - 30 * 86400_000));
  const [to, setTo] = useState(() => toDateInput(Date.now()));
  const [status, setStatus] = useState<Status | "">("");
  const [loading, setLoading] = useState(false);

  const exportCsv = async () => {
    setLoading(true);
    try {
      const rows = await convex.query(api.orders.exportRows, {
        from: fromDateInput(from) ?? 0,
        to: fromDateInput(to, true) ?? Date.now(),
        status: status || undefined,
      });
      const header = ["N° commande", "Date", "Statut", "Client", "Téléphone", "Ville", "Adresse", "E-mail", "Articles", "Sous-total", "Remise", "Code promo", "Livraison", "Total"];
      const lines = rows.map((r) =>
        [r.orderNumber, dateTime(r.date), ORDER_STATUS_LABELS[r.status], r.fullName, r.phone, r.city, r.address, r.email, r.items, r.subtotal, r.discount, r.couponCode, r.deliveryFee, r.total].map(csvCell).join(";"),
      );
      const blob = new Blob(["﻿" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `commandes-${from}-${to}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`${rows.length} commande(s) exportée(s)`);
      setOpen(false);
    } catch {
      toast.error("Export impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-lg"><Download className="size-4" /> Exporter CSV</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Exporter les commandes</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Du"><input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Au"><input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Statut" className="sm:col-span-2">
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as Status | "")}>
              <option value="">Tous</option>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={exportCsv} disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />} Télécharger</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrdersInner() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | "">("");
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 300);
  const counts = useQuery(api.orders.statusCounts);
  const { results, status: load, loadMore } = usePaginatedQuery(api.orders.adminList, { status: status || undefined, search: q || undefined }, { initialNumItems: 25 });
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;

  return (
    <div>
      <PageHeader title="Commandes" description="Suivez et traitez les commandes en paiement à la livraison." actions={<ExportDialog />} />
      <div className="scrollbar-none mb-4 flex gap-1.5 overflow-x-auto">
        {[["", "Toutes", total] as const, ...ORDER_STATUSES.map((s) => [s, ORDER_STATUS_LABELS[s], counts?.[s]] as const)].map(([key, label, count]) => (
          <button
            key={key || "all"}
            type="button"
            onClick={() => setStatus(key as Status | "")}
            className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", status === key ? "border-navy bg-navy text-white" : "bg-white hover:border-navy")}
          >
            {label} {count !== undefined && <span className="ms-1 opacity-70 tabular-nums">{count}</span>}
          </button>
        ))}
      </div>
      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="N° de commande, nom ou téléphone du client…" className={`${inputClass} ps-9`} />
      </div>
      <div className="overflow-hidden rounded-2xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>Commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">Ville</TableHead>
              <TableHead className="hidden lg:table-cell">Articles</TableHead>
              <TableHead className="text-end">Total</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {load === "LoadingFirstPage" && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>
            ))}
            {load !== "LoadingFirstPage" && results.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-16 text-center text-muted-foreground">Aucune commande.</TableCell></TableRow>
            )}
            {results.map((o) => (
              <TableRow key={o._id} className="cursor-pointer" onClick={() => router.push(`/admin/orders/${o._id}`)}>
                <TableCell>
                  <Link href={`/admin/orders/${o._id}`} className="font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{o.orderNumber}</Link>
                  <p className="text-xs text-muted-foreground">{dateTime(o._creationTime)}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{o.customer.fullName}</p>
                  <p className="text-xs text-muted-foreground">{o.customer.phone}</p>
                </TableCell>
                <TableCell className="hidden md:table-cell">{o.customer.city}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{o.items.reduce((s, i) => s + i.quantity, 0)} article(s)</TableCell>
                <TableCell className="text-end font-semibold tabular-nums">{dh(o.total)}</TableCell>
                <TableCell><OrderStatusBadge status={o.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {load === "CanLoadMore" && <div className="border-t p-3 text-center"><Button variant="outline" onClick={() => loadMore(25)}>Charger plus</Button></div>}
        {load === "LoadingMore" && <div className="border-t p-3 text-center"><Loader2 className="mx-auto size-5 animate-spin" /></div>}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequirePermission perm="orders">
      <OrdersInner />
    </RequirePermission>
  );
}
