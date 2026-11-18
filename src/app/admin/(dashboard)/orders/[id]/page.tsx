"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { ArrowLeft, ImageOff, Loader2, Pencil, Phone, Printer, Save, User } from "lucide-react";
import { Panel } from "@/components/admin/page-header";
import { OrderStatusBadge, ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/components/admin/status";
import { RequirePermission } from "@/components/admin/admin-shell";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { dateTime, dh } from "@/lib/admin-format";
import { whatsappLink } from "@/lib/format";
import { WhatsappIcon } from "@/components/store/whatsapp-fab";

type Status = Doc<"orders">["status"];

function CustomerEditDialog({ order, open, onOpenChange }: { order: Doc<"orders">; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [c, setC] = useState({ ...order.customer, email: order.customer.email ?? "" });
  const save = useAdminMutation(api.orders.updateCustomerInfo, { success: "Informations client mises à jour", revalidate: false });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Modifier les informations client</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom complet" className="sm:col-span-2"><input className={inputClass} value={c.fullName} onChange={(e) => setC({ ...c, fullName: e.target.value })} /></Field>
          <Field label="Téléphone"><input className={inputClass} value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></Field>
          <Field label="Ville"><input className={inputClass} value={c.city} onChange={(e) => setC({ ...c, city: e.target.value })} /></Field>
          <Field label="Adresse" className="sm:col-span-2"><textarea rows={2} className={`${inputClass} h-auto py-2`} value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} /></Field>
          <Field label="E-mail" className="sm:col-span-2"><input className={inputClass} value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button disabled={save.pending} onClick={async () => { await save.run({ id: order._id, customer: { ...c, email: c.email || undefined } }); onOpenChange(false); }}>
            {save.pending && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetail({ id }: { id: Id<"orders"> }) {
  const data = useQuery(api.orders.adminGet, { id });
  const updateStatus = useAdminMutation(api.orders.updateStatus, { success: "Statut mis à jour" });
  const saveNotes = useAdminMutation(api.orders.updateInternalNotes, { success: "Notes enregistrées", revalidate: false });
  const [next, setNext] = useState<Status | "">("");
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<string | null>(null);
  const [editCustomer, setEditCustomer] = useState(false);

  if (data === undefined) return <Skeleton className="h-[600px] rounded-2xl" />;
  if (data === null) return <p className="rounded-2xl border bg-white p-10 text-center">Commande introuvable.</p>;
  const { order, history, customer } = data;
  const wa = whatsappLink(order.customer.phone, `Bonjour ${order.customer.fullName}, Electro-Ikram vous contacte au sujet de votre commande ${order.orderNumber}.`);
  const applyStatus = async () => {
    if (!next) return;
    await updateStatus.run({ id, status: next, note: note || undefined });
    setNext("");
    setNote("");
  };
  const willRestock = next === "cancelled" || next === "returned";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="grid size-9 place-items-center rounded-lg border bg-white hover:bg-secondary" aria-label="Retour"><ArrowLeft className="size-4" /></Link>
          <div>
            <h1 className="flex items-center gap-3 text-xl font-bold text-navy">{order.orderNumber} <OrderStatusBadge status={order.status} /></h1>
            <p className="text-sm text-muted-foreground">Passée le {dateTime(order._creationTime)} · {order.locale === "ar" ? "Arabe" : "Français"} · Paiement à la livraison</p>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-lg">
          <Link href={`/admin/orders/${id}/invoice`} target="_blank"><Printer className="size-4" /> Imprimer la facture</Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title="Articles">
            <ul className="-my-3 divide-y">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex items-center gap-3 py-3">
                  <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-white">
                    {i.image ? <Image src={i.image.url} alt="" fill sizes="48px" className="object-contain p-0.5" /> : <ImageOff className="size-4 text-muted-foreground" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${i.productId}`} className="line-clamp-1 font-medium hover:text-primary">{i.nameFr}</Link>
                    <p className="text-xs text-muted-foreground">{i.sku} · {i.quantity} × {dh(i.price)}</p>
                  </div>
                  <p className="font-semibold tabular-nums">{dh(i.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd className="tabular-nums">{dh(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Remise {order.couponCode && `(${order.couponCode})`}</dt><dd className="tabular-nums">−{dh(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Livraison</dt><dd className="tabular-nums">{order.deliveryFee ? dh(order.deliveryFee) : "Gratuite"}</dd></div>
              <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total à encaisser</dt><dd className="tabular-nums">{dh(order.total)}</dd></div>
            </dl>
          </Panel>

          <Panel title="Changer le statut">
            <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
              <Field label="Nouveau statut">
                <select className={inputClass} value={next} onChange={(e) => setNext(e.target.value as Status | "")}>
                  <option value="">— Choisir —</option>
                  {ORDER_STATUSES.filter((s) => s !== order.status).map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
                </select>
              </Field>
              <Field label="Note (historique)">
                <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : client injoignable, livré par Amana…" />
              </Field>
              {willRestock ? (
                <ConfirmDialog
                  trigger={<Button disabled={updateStatus.pending} variant="destructive" className="h-11 rounded-xl">Appliquer</Button>}
                  title={`Passer la commande en « ${ORDER_STATUS_LABELS[next]} » ?`}
                  description="Le stock des articles sera automatiquement réintégré."
                  confirmLabel="Confirmer"
                  onConfirm={applyStatus}
                />
              ) : (
                <Button disabled={!next || updateStatus.pending} onClick={applyStatus} className="h-11 rounded-xl">
                  {updateStatus.pending && <Loader2 className="size-4 animate-spin" />} Appliquer
                </Button>
              )}
            </div>
          </Panel>

          <Panel title="Historique">
            <ol className="relative space-y-4 border-s ps-5">
              {[...history].reverse().map((h) => (
                <li key={h._id} className="relative">
                  <span className="absolute -start-[25px] top-1 size-2.5 rounded-full bg-primary ring-4 ring-white" />
                  <div className="flex flex-wrap items-center gap-2"><OrderStatusBadge status={h.status} /><span className="text-xs text-muted-foreground">{dateTime(h._creationTime)}{h.changedByName ? ` · ${h.changedByName}` : " · Client"}</span></div>
                  {h.note && <p className="mt-1 text-sm">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Client" actions={<button type="button" onClick={() => setEditCustomer(true)} className="text-muted-foreground hover:text-primary" aria-label="Modifier"><Pencil className="size-4" /></button>}>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 font-semibold"><User className="size-4 text-muted-foreground" /> {order.customer.fullName}</p>
              <p className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /><a href={`tel:${order.customer.phone}`} className="text-primary hover:underline">{order.customer.phone}</a></p>
              {order.customer.email && <p className="text-muted-foreground">{order.customer.email}</p>}
              <p className="text-muted-foreground">{order.customer.address}<br />{order.customer.city}</p>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-semibold text-white">
                  <WhatsappIcon className="size-4" /> Contacter sur WhatsApp
                </a>
              )}
              {customer && (
                <Link href={`/admin/customers/${customer._id}`} className="block pt-2 text-xs text-primary hover:underline">
                  Fiche client · {customer.totalOrders} commande(s) · {dh(customer.totalSpent)}{customer.isBlocked ? " · BLOQUÉ" : ""}
                </Link>
              )}
            </div>
          </Panel>
          {order.notes && (
            <Panel title="Note du client"><p className="whitespace-pre-line text-sm">{order.notes}</p></Panel>
          )}
          <Panel title="Notes internes" description="Visibles uniquement par l'équipe.">
            <textarea rows={5} className={`${inputClass} h-auto py-2`} value={notes ?? order.internalNotes ?? ""} onChange={(e) => setNotes(e.target.value)} />
            <Button size="sm" className="mt-3" disabled={notes === null || saveNotes.pending} onClick={async () => { await saveNotes.run({ id, internalNotes: notes ?? "" }); setNotes(null); }}>
              <Save className="size-4" /> Enregistrer
            </Button>
          </Panel>
        </div>
      </div>
      {editCustomer && <CustomerEditDialog order={order} open={editCustomer} onOpenChange={setEditCustomer} />}
    </div>
  );
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission perm="orders">
      <OrderDetail id={id as Id<"orders">} />
    </RequirePermission>
  );
}
