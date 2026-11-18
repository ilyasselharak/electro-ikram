"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ArrowLeft, Ban, CheckCircle2, Mail, MapPin, Phone, Save } from "lucide-react";
import { Panel } from "@/components/admin/page-header";
import { OrderStatusBadge } from "@/components/admin/status";
import { RequirePermission } from "@/components/admin/admin-shell";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { inputClass } from "@/components/shared/field";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { dateOnly, dateTime, dh } from "@/lib/admin-format";

function CustomerDetail({ id }: { id: Id<"customers"> }) {
  const data = useQuery(api.customers.adminGet, { id });
  const saveNotes = useAdminMutation(api.customers.updateNotes, { success: "Notes enregistrées", revalidate: false });
  const setBlocked = useAdminMutation(api.customers.setBlocked, { revalidate: false });
  const [notes, setNotes] = useState<string | null>(null);

  if (data === undefined) return <Skeleton className="h-96 rounded-2xl" />;
  if (data === null) return <p className="rounded-2xl border bg-white p-10 text-center">Client introuvable.</p>;
  const { customer: c, orders } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/customers" className="grid size-9 place-items-center rounded-lg border bg-white hover:bg-secondary" aria-label="Retour"><ArrowLeft className="size-4" /></Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-navy">{c.fullName} {c.isBlocked && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Bloqué</span>}</h1>
            <p className="text-sm text-muted-foreground">Client depuis le {dateOnly(c._creationTime)}</p>
          </div>
        </div>
        <ConfirmDialog
          trigger={c.isBlocked ? <Button variant="outline"><CheckCircle2 className="size-4" /> Débloquer</Button> : <Button variant="destructive"><Ban className="size-4" /> Bloquer</Button>}
          title={c.isBlocked ? "Débloquer ce client ?" : "Bloquer ce client ?"}
          description={c.isBlocked ? "Il pourra de nouveau passer commande." : "Les nouvelles commandes avec ce numéro seront refusées."}
          destructive={!c.isBlocked}
          onConfirm={() => setBlocked.run({ id, isBlocked: !c.isBlocked }, { success: c.isBlocked ? "Client débloqué" : "Client bloqué" })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-muted-foreground">Commandes</p><p className="mt-1 text-2xl font-bold">{c.totalOrders}</p></div>
        <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-muted-foreground">Total des achats</p><p className="mt-1 text-2xl font-bold">{dh(c.totalSpent)}</p></div>
        <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-muted-foreground">Panier moyen</p><p className="mt-1 text-2xl font-bold">{dh(c.totalOrders ? c.totalSpent / c.totalOrders : 0)}</p></div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel title="Historique des commandes">
          {orders.length === 0 ? <p className="text-sm text-muted-foreground">Aucune commande.</p> : (
            <ul className="-my-3 divide-y">
              {orders.map((o) => (
                <li key={o._id}>
                  <Link href={`/admin/orders/${o._id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                    <div className="flex-1">
                      <p className="font-semibold text-primary">{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{dateTime(o.createdAt)} · {o.itemCount} article(s)</p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                    <p className="w-24 text-end font-semibold tabular-nums">{dh(o.total)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="Coordonnées">
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><Phone className="size-4 text-muted-foreground" /><a href={`tel:${c.phone}`} className="text-primary">{c.phone}</a></li>
              {c.email && <li className="flex gap-2"><Mail className="size-4 text-muted-foreground" />{c.email}</li>}
              <li className="flex gap-2"><MapPin className="size-4 shrink-0 text-muted-foreground" />{c.address}{c.city ? `, ${c.city}` : ""}</li>
            </ul>
          </Panel>
          <Panel title="Notes internes">
            <textarea rows={5} className={`${inputClass} h-auto py-2`} value={notes ?? c.notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
            <Button size="sm" className="mt-3" disabled={notes === null} onClick={async () => { await saveNotes.run({ id, notes: notes ?? "" }); setNotes(null); }}>
              <Save className="size-4" /> Enregistrer
            </Button>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission perm="customers">
      <CustomerDetail id={id as Id<"customers">} />
    </RequirePermission>
  );
}
