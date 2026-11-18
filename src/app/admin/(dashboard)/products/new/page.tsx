"use client";

import { ProductForm } from "@/components/admin/product-form";
import { RequirePermission } from "@/components/admin/admin-shell";

export default function NewProductPage() {
  return (
    <RequirePermission perm="catalog">
      <ProductForm />
    </RequirePermission>
  );
}
