"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ProductForm } from "@/components/admin/product-form";
import { RequirePermission } from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = useQuery(api.products.adminGet, { id: id as Id<"products"> });
  return (
    <RequirePermission perm="catalog">
      {product === undefined ? (
        <Skeleton className="h-[600px] rounded-2xl" />
      ) : product === null ? (
        <p className="rounded-2xl border bg-white p-10 text-center text-muted-foreground">Produit introuvable.</p>
      ) : (
        <ProductForm key={product._id + product.updatedAt} product={product} />
      )}
    </RequirePermission>
  );
}
