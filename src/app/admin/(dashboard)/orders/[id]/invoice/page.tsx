"use client";

import { use, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Printer } from "lucide-react";
import { Logo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { dateOnly, dh } from "@/lib/admin-format";
import { ORDER_STATUS_LABELS } from "@/components/admin/status";

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const data = useQuery(api.orders.adminGet, { id: id as Id<"orders"> });
  const settings = useQuery(api.settings.getPublic);

  useEffect(() => {
    if (data && settings) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [data, settings]);

  if (!data || !settings) return <p className="p-10 text-center text-muted-foreground">Chargement…</p>;
  const { order } = data;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm print:max-w-none print:p-0 [&_*]:print:shadow-none">
      <style>{`@media print { aside, header, nav { display: none !important; } main { padding: 0 !important; } body { background: white !important; } .no-print { display: none !important; } }`}</style>
      <div className="no-print mb-6 flex justify-end">
        <Button onClick={() => window.print()}><Printer className="size-4" /> Imprimer</Button>
      </div>
      <div className="flex items-start justify-between border-b pb-6">
        <div>
          <Logo logo={settings.logo} />
          <div className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {settings.addressFr && <p>{settings.addressFr}</p>}
            {settings.phone && <p>Tél. : {settings.phone}</p>}
            {settings.email && <p>{settings.email}</p>}
          </div>
        </div>
        <div className="text-end">
          <h1 className="text-2xl font-bold text-navy">FACTURE</h1>
          <p className="mt-1 font-semibold">{order.orderNumber}</p>
          <p className="text-muted-foreground">Date : {dateOnly(order._creationTime)}</p>
          <p className="text-muted-foreground">Statut : {ORDER_STATUS_LABELS[order.status]}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 py-6">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Facturé et livré à</p>
          <p className="mt-1 font-semibold">{order.customer.fullName}</p>
          <p>{order.customer.phone}</p>
          <p>{order.customer.address}</p>
          <p>{order.customer.city}</p>
        </div>
        <div className="text-end">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Paiement</p>
          <p className="mt-1">Paiement à la livraison (espèces)</p>
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y bg-secondary/60 text-start text-xs uppercase">
            <th className="p-2 text-start">Réf.</th>
            <th className="p-2 text-start">Désignation</th>
            <th className="p-2 text-end">Qté</th>
            <th className="p-2 text-end">P.U.</th>
            <th className="p-2 text-end">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i, idx) => (
            <tr key={idx} className="border-b">
              <td className="p-2 text-xs">{i.sku}</td>
              <td className="p-2">{i.nameFr}</td>
              <td className="p-2 text-end">{i.quantity}</td>
              <td className="p-2 text-end tabular-nums">{dh(i.price)}</td>
              <td className="p-2 text-end tabular-nums">{dh(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ms-auto mt-4 w-64 space-y-1">
        <div className="flex justify-between"><dt>Sous-total</dt><dd className="tabular-nums">{dh(order.subtotal)}</dd></div>
        {order.discount > 0 && <div className="flex justify-between"><dt>Remise {order.couponCode}</dt><dd className="tabular-nums">−{dh(order.discount)}</dd></div>}
        <div className="flex justify-between"><dt>Livraison</dt><dd className="tabular-nums">{dh(order.deliveryFee)}</dd></div>
        <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total TTC</dt><dd className="tabular-nums">{dh(order.total)}</dd></div>
      </dl>
      <p className="mt-12 text-center text-xs text-muted-foreground">Merci pour votre confiance — {settings.storeName}</p>
    </div>
  );
}
