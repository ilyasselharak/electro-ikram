import { cn } from "@/lib/utils";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  processing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  returned: "Retournée",
};
export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as (keyof typeof ORDER_STATUS_LABELS)[];

const ORDER_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-cyan-100 text-cyan-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
  returned: "bg-zinc-200 text-zinc-700",
};

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", ORDER_STYLES[status], className)}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

const PRODUCT_STATUS: Record<string, [string, string]> = {
  published: ["Publié", "bg-emerald-100 text-emerald-800"],
  draft: ["Brouillon", "bg-zinc-200 text-zinc-700"],
  archived: ["Archivé", "bg-rose-100 text-rose-800"],
};

export function ProductStatusBadge({ status }: { status: string }) {
  const [label, cls] = PRODUCT_STATUS[status] ?? [status, ""];
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", cls)}>{label}</span>;
}

export function StockBadge({ stock, min }: { stock: number; min: number }) {
  if (stock <= 0) return <span className="text-xs font-semibold text-rose-600">Rupture</span>;
  if (stock <= min) return <span className="text-xs font-semibold text-amber-600 tabular-nums">{stock} · faible</span>;
  return <span className="text-xs font-semibold text-emerald-700 tabular-nums">{stock}</span>;
}
