"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { AlertTriangle, Banknote, Clock, PackageCheck, Package, ShoppingCart, Users, XCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { api } from "@convex/_generated/api";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { OrderStatusBadge } from "@/components/admin/status";
import { RevenueChart, OrdersChart } from "@/components/admin/charts";
import { useCan } from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { dateTime, dh } from "@/lib/admin-format";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "12m", label: "12 mois" },
] as const;

function Kpi({ label, value, icon: Icon, tone = "primary", hint }: { label: string; value: string | number; icon: typeof Package; tone?: string; hint?: string }) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
  };
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-xl", tones[tone])}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function OverviewPage() {
  const canStats = useCan("stats");
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("30d");
  const [tz] = useState(() => new Date().getTimezoneOffset());
  const data = useQuery(api.stats.overview, canStats ? { range, tzOffset: tz } : "skip");

  if (!canStats) {
    return (
      <div>
        <PageHeader title="Bienvenue" description="Accès rapide à vos sections." />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["/admin/products", "Produits"],
            ["/admin/categories", "Catégories"],
            ["/admin/homepage", "Page d'accueil"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="flex items-center justify-between rounded-2xl border bg-white p-5 font-semibold hover:border-primary">
              {label} <ArrowRight className="size-4" />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Vue d'ensemble"
        description="Performances de la boutique"
        actions={
          <div className="flex rounded-xl border bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", range === r.key ? "bg-navy text-white" : "text-muted-foreground hover:text-foreground")}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />
      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Chiffre d'affaires" value={dh(data.revenue)} icon={Banknote} hint={`Livré : ${dh(data.deliveredRevenue)} · Panier moyen ${dh(data.averageOrderValue)}`} />
            <Kpi label="Commandes" value={data.totalOrders} icon={ShoppingCart} tone="sky" />
            <Kpi label="En attente" value={data.statusCounts.pending} icon={Clock} tone="amber" />
            <Kpi label="Confirmées" value={data.statusCounts.confirmed + data.statusCounts.processing + data.statusCounts.shipped} icon={CheckCircle2} tone="primary" hint="Confirmées, en préparation ou expédiées" />
            <Kpi label="Livrées" value={data.statusCounts.delivered} icon={PackageCheck} tone="green" />
            <Kpi label="Annulées / retournées" value={data.statusCounts.cancelled + data.statusCounts.returned} icon={XCircle} tone="rose" />
            <Kpi label="Produits" value={data.totalProducts} icon={Package} hint={`${data.publishedProducts} publiés · ${data.lowStockCount} stock faible`} tone={data.lowStockCount ? "amber" : "primary"} />
            <Kpi label="Clients" value={data.totalCustomers} icon={Users} hint={`${data.newCustomers} nouveaux sur la période`} tone="sky" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Chiffre d'affaires">
              <RevenueChart data={data.series} />
            </Panel>
            <Panel title="Commandes">
              <OrdersChart data={data.series} />
            </Panel>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Panel title="Commandes récentes" actions={<Link href="/admin/orders" className="text-sm text-primary hover:underline">Tout voir</Link>}>
              {data.recentOrders.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucune commande pour le moment.</p>
              ) : (
                <ul className="-my-2 divide-y">
                  {data.recentOrders.map((o) => (
                    <li key={o._id}>
                      <Link href={`/admin/orders/${o._id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{o.orderNumber}</p>
                          <p className="truncate text-xs text-muted-foreground">{o.fullName} · {o.city} · {dateTime(o.createdAt)}</p>
                        </div>
                        <OrderStatusBadge status={o.status} />
                        <p className="w-24 text-end text-sm font-semibold tabular-nums">{dh(o.total)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <div className="space-y-6">
              <Panel title="Meilleures ventes">
                {data.bestSelling.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Pas encore de ventes sur la période.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.bestSelling.map((p) => {
                      const img = p.image as { url: string } | null;
                      return (
                        <li key={p.productId} className="flex items-center gap-3">
                          <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border bg-white">
                            {img && <Image src={img.url} alt="" fill sizes="40px" className="object-contain p-0.5" />}
                          </span>
                          <p className="line-clamp-1 flex-1 text-sm">{p.nameFr}</p>
                          <span className="text-xs text-muted-foreground tabular-nums">{p.quantity} vendus</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
              <Panel title="Stock faible" actions={<Link href="/admin/products?stock=low" className="text-sm text-primary hover:underline">Gérer</Link>}>
                {data.lowStock.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Tous les stocks sont suffisants.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {data.lowStock.map((p) => (
                      <li key={p._id}>
                        <Link href={`/admin/products/${p._id}`} className="flex items-center gap-2 text-sm hover:text-primary">
                          <AlertTriangle className={cn("size-4", p.stock <= 0 ? "text-rose-600" : "text-amber-600")} />
                          <span className="line-clamp-1 flex-1">{p.nameFr}</span>
                          <span className={cn("font-semibold tabular-nums", p.stock <= 0 ? "text-rose-600" : "text-amber-600")}>{p.stock}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
