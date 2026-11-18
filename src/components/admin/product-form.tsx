"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "convex/react";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { ArrowLeft, ExternalLink, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { slugifyClient } from "@/lib/slug";
import { dh } from "@/lib/admin-format";
import { Panel } from "./page-header";
import { ImageUploader } from "./image-uploader";
import { SeoFields, cleanSeo, type SeoValue } from "./seo-fields";
import { CategorySelect } from "./category-select";

const numStr = (label: string, opts: { required?: boolean; int?: boolean } = {}) =>
  z.string().trim().refine(
    (v) => {
      if (!v) return !opts.required;
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) && n >= 0 && (!opts.int || Number.isInteger(n));
    },
    { message: opts.required ? `${label} : nombre positif requis` : `${label} : nombre invalide` },
  );

const schema = z
  .object({
    nameFr: z.string().trim().min(2, "Nom (FR) requis").max(200),
    nameAr: z.string().trim().min(2, "Nom (AR) requis").max(200),
    slug: z.string().trim().max(100).optional(),
    shortDescriptionFr: z.string().max(300).optional(),
    shortDescriptionAr: z.string().max(300).optional(),
    descriptionFr: z.string().max(20000),
    descriptionAr: z.string().max(20000),
    categoryId: z.string().min(1, "Catégorie requise"),
    brandId: z.string().optional(),
    sku: z.string().trim().min(1, "SKU requis").max(64).regex(/^[A-Za-z0-9._-]+$/, "Lettres, chiffres, . _ - uniquement"),
    barcode: z.string().trim().max(32).optional(),
    purchasePrice: numStr("Prix d'achat"),
    price: numStr("Prix de vente", { required: true }),
    oldPrice: numStr("Ancien prix"),
    stock: numStr("Stock", { required: true, int: true }),
    minStockAlert: numStr("Alerte stock", { required: true, int: true }),
    warrantyFr: z.string().max(120).optional(),
    warrantyAr: z.string().max(120).optional(),
    specs: z.array(z.object({ labelFr: z.string(), labelAr: z.string(), valueFr: z.string(), valueAr: z.string() })),
    images: z.array(z.object({ publicId: z.string(), url: z.string(), width: z.number().optional(), height: z.number().optional(), alt: z.string().optional() })),
    isFeatured: z.boolean(),
    isBestSeller: z.boolean(),
    status: z.enum(["published", "draft", "archived"]),
    seo: z.custom<SeoValue>().optional(),
  })
  .refine((v) => !v.oldPrice || Number(v.oldPrice) > Number(v.price), { path: ["oldPrice"], message: "L'ancien prix doit être supérieur au prix de vente." });

type Values = z.infer<typeof schema>;
const toNum = (s?: string) => (s && s.trim() ? Number(s.replace(",", ".")) : undefined);

export function ProductForm({ product }: { product?: Doc<"products"> }) {
  const router = useRouter();
  const brands = useQuery(api.brands.adminList);
  const create = useAdminMutation(api.products.create, { success: "Produit créé" });
  const update = useAdminMutation(api.products.update, { success: "Produit enregistré" });

  const defaults: Values = useMemo(
    () => ({
      nameFr: product?.nameFr ?? "",
      nameAr: product?.nameAr ?? "",
      slug: product?.slug ?? "",
      shortDescriptionFr: product?.shortDescriptionFr ?? "",
      shortDescriptionAr: product?.shortDescriptionAr ?? "",
      descriptionFr: product?.descriptionFr ?? "",
      descriptionAr: product?.descriptionAr ?? "",
      categoryId: product?.categoryId ?? "",
      brandId: product?.brandId ?? "",
      sku: product?.sku ?? "",
      barcode: product?.barcode ?? "",
      purchasePrice: product?.purchasePrice?.toString() ?? "",
      price: product?.price?.toString() ?? "",
      oldPrice: product?.oldPrice?.toString() ?? "",
      stock: product?.stock?.toString() ?? "0",
      minStockAlert: product?.minStockAlert?.toString() ?? "3",
      warrantyFr: product?.warrantyFr ?? "",
      warrantyAr: product?.warrantyAr ?? "",
      specs: product?.specs ?? [],
      images: product?.images ?? [],
      isFeatured: product?.isFeatured ?? false,
      isBestSeller: product?.isBestSeller ?? false,
      status: product?.status ?? "draft",
      seo: product?.seo ?? {},
    }),
    [product],
  );

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { register, control, handleSubmit, formState, setValue } = form;
  const specs = useFieldArray({ control, name: "specs" });
  const err = formState.errors;
  const [price, purchase, oldPrice, nameFr, slug, shortFr] = useWatch({ control, name: ["price", "purchasePrice", "oldPrice", "nameFr", "slug", "shortDescriptionFr"] });
  const margin = toNum(price) !== undefined && toNum(purchase) !== undefined ? toNum(price)! - toNum(purchase)! : undefined;
  const discount = toNum(oldPrice) && toNum(price) && toNum(oldPrice)! > toNum(price)! ? Math.round(((toNum(oldPrice)! - toNum(price)!) / toNum(oldPrice)!) * 100) : 0;
  const pending = create.pending || update.pending;

  const onSubmit = async (v: Values) => {
    const payload = {
      nameFr: v.nameFr,
      nameAr: v.nameAr,
      slug: v.slug?.trim() || undefined,
      descriptionFr: v.descriptionFr,
      descriptionAr: v.descriptionAr,
      shortDescriptionFr: v.shortDescriptionFr || undefined,
      shortDescriptionAr: v.shortDescriptionAr || undefined,
      categoryId: v.categoryId as Id<"categories">,
      brandId: v.brandId ? (v.brandId as Id<"brands">) : undefined,
      sku: v.sku,
      barcode: v.barcode || undefined,
      purchasePrice: toNum(v.purchasePrice),
      price: toNum(v.price)!,
      oldPrice: toNum(v.oldPrice),
      stock: toNum(v.stock)!,
      minStockAlert: toNum(v.minStockAlert)!,
      warrantyFr: v.warrantyFr || undefined,
      warrantyAr: v.warrantyAr || undefined,
      specs: v.specs.filter((s) => s.labelFr || s.labelAr),
      images: v.images.map((i) => ({ ...i, alt: i.alt?.trim() || undefined })),
      isFeatured: v.isFeatured,
      isBestSeller: v.isBestSeller,
      status: v.status,
      seo: cleanSeo(v.seo),
    };
    if (product) {
      await update.run({ id: product._id, ...payload });
    } else {
      const id = await create.run(payload);
      if (id) router.replace(`/admin/products/${id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, () => window.scrollTo({ top: 0, behavior: "smooth" }))} className="space-y-6" noValidate>
      <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b bg-secondary/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="grid size-9 place-items-center rounded-lg border bg-white hover:bg-secondary" aria-label="Retour">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-navy">{product ? "Modifier le produit" : "Nouveau produit"}</h1>
            {product && <p className="text-xs text-muted-foreground">{product.sku}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {product?.status === "published" && (
            <a href={`/fr/product/${product.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm hover:bg-secondary">
              <ExternalLink className="size-4" /> Voir
            </a>
          )}
          <Button type="submit" disabled={pending} className="h-9 rounded-lg px-4">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer
          </Button>
        </div>
      </div>

      {Object.keys(err).length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-semibold">Veuillez corriger les erreurs :</p>
          <ul className="mt-1 list-inside list-disc">
            {Object.entries(err).map(([k, e]) => (
              <li key={k}>{(e as { message?: string })?.message ?? k}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title="Informations générales">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nom du produit (FR)" required error={err.nameFr?.message}>
                <input className={inputClass} {...register("nameFr")} />
              </Field>
              <Field label="Nom du produit (AR)" required error={err.nameAr?.message}>
                <input className={inputClass} dir="rtl" {...register("nameAr")} />
              </Field>
              <Field
                label="Slug (URL)"
                className="md:col-span-2"
                hint={`URL identique en FR et AR : /fr/product/${slug || slugifyClient(nameFr || "") || "…"} · Un changement crée une redirection 301 automatique.`}
              >
                <div className="flex gap-2">
                  <input className={inputClass} {...register("slug")} placeholder={slugifyClient(nameFr || "")} />
                  <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setValue("slug", slugifyClient(nameFr || ""))}>
                    Générer
                  </Button>
                </div>
              </Field>
            </div>
            <Tabs defaultValue="fr" className="mt-5">
              <TabsList>
                <TabsTrigger value="fr">Français</TabsTrigger>
                <TabsTrigger value="ar">العربية</TabsTrigger>
              </TabsList>
              <TabsContent value="fr" className="space-y-4 pt-3">
                <Field label="Description courte (FR)" hint="Affichée près du prix (≈ 1 à 2 phrases).">
                  <textarea rows={2} className={`${inputClass} h-auto py-2`} {...register("shortDescriptionFr")} />
                </Field>
                <Field label="Description complète (FR)">
                  <textarea rows={10} className={`${inputClass} h-auto py-2`} {...register("descriptionFr")} />
                </Field>
              </TabsContent>
              <TabsContent value="ar" className="space-y-4 pt-3" dir="rtl">
                <Field label="الوصف المختصر">
                  <textarea rows={2} className={`${inputClass} h-auto py-2`} {...register("shortDescriptionAr")} />
                </Field>
                <Field label="الوصف الكامل">
                  <textarea rows={10} className={`${inputClass} h-auto py-2`} {...register("descriptionAr")} />
                </Field>
              </TabsContent>
            </Tabs>
          </Panel>

          <Panel title="Images" description="Glissez pour réordonner. La première image est l'image principale.">
            <Controller control={control} name="images" render={({ field }) => <ImageUploader folder="products" value={field.value} onChange={field.onChange} />} />
          </Panel>

          <Panel title="Prix">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Prix de vente (DH)" required error={err.price?.message}>
                <input inputMode="decimal" className={inputClass} {...register("price")} />
              </Field>
              <Field label="Ancien prix (DH)" error={err.oldPrice?.message} hint={discount ? `Remise affichée : -${discount}%` : "Pour afficher une remise"}>
                <input inputMode="decimal" className={inputClass} {...register("oldPrice")} />
              </Field>
              <Field label="Prix d'achat (DH)" error={err.purchasePrice?.message} hint={margin !== undefined ? `Marge : ${dh(margin)}` : "Interne — jamais affiché"}>
                <input inputMode="decimal" className={inputClass} {...register("purchasePrice")} />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Caractéristiques techniques"
            actions={
              <Button type="button" size="sm" variant="outline" onClick={() => specs.append({ labelFr: "", labelAr: "", valueFr: "", valueAr: "" })}>
                <Plus className="size-4" /> Ajouter
              </Button>
            }
          >
            {specs.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune caractéristique. Ex. : Capacité → 340 L, Classe énergétique → A++.</p>
            ) : (
              <div className="space-y-3">
                <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_36px] gap-2 text-xs font-medium text-muted-foreground md:grid">
                  <span>Libellé FR</span><span>Valeur FR</span><span>Libellé AR</span><span>Valeur AR</span><span />
                </div>
                {specs.fields.map((f, i) => (
                  <div key={f.id} className="grid grid-cols-2 gap-2 rounded-xl border p-2 md:grid-cols-[1fr_1fr_1fr_1fr_36px] md:border-0 md:p-0">
                    <input className={`${inputClass} h-9`} placeholder="Capacité" {...register(`specs.${i}.labelFr`)} />
                    <input className={`${inputClass} h-9`} placeholder="340 L" {...register(`specs.${i}.valueFr`)} />
                    <input className={`${inputClass} h-9`} dir="rtl" placeholder="السعة" {...register(`specs.${i}.labelAr`)} />
                    <input className={`${inputClass} h-9`} dir="rtl" placeholder="340 لتر" {...register(`specs.${i}.valueAr`)} />
                    <button type="button" onClick={() => specs.remove(i)} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Supprimer">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="SEO" description="Optimisation pour les moteurs de recherche et le partage social.">
            <Controller
              control={control}
              name="seo"
              render={({ field }) => (
                <SeoFields
                  value={field.value}
                  onChange={field.onChange}
                  previewUrl={`electro-ikram.ma › fr › product › ${slug || slugifyClient(nameFr || "")}`}
                  fallbackTitle={nameFr || "Nom du produit"}
                  fallbackDescription={shortFr}
                />
              )}
            />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Publication">
            <div className="space-y-4">
              <Field label="Statut">
                <select className={inputClass} {...register("status")}>
                  <option value="published">Publié (visible)</option>
                  <option value="draft">Brouillon (masqué)</option>
                  <option value="archived">Archivé (masqué)</option>
                </select>
              </Field>
              <Controller
                control={control}
                name="isFeatured"
                render={({ field }) => (
                  <label className="flex items-center justify-between text-sm font-medium">
                    Produit mis en avant <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </label>
                )}
              />
              <Controller
                control={control}
                name="isBestSeller"
                render={({ field }) => (
                  <label className="flex items-center justify-between text-sm font-medium">
                    Meilleure vente <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </label>
                )}
              />
            </div>
          </Panel>
          <Panel title="Organisation">
            <div className="space-y-4">
              <Field label="Catégorie" required error={err.categoryId?.message}>
                <Controller control={control} name="categoryId" render={({ field }) => <CategorySelect value={field.value} onChange={field.onChange} />} />
              </Field>
              <Field label="Marque">
                <select className={inputClass} {...register("brandId")}>
                  <option value="">— Aucune —</option>
                  {brands?.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Panel>
          <Panel title="Inventaire">
            <div className="space-y-4">
              <Field label="SKU / Référence" required error={err.sku?.message}>
                <input className={`${inputClass} uppercase`} {...register("sku")} />
              </Field>
              <Field label="Code-barres (EAN)" error={err.barcode?.message}>
                <input className={inputClass} {...register("barcode")} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Stock" required error={err.stock?.message}>
                  <input inputMode="numeric" className={inputClass} {...register("stock")} />
                </Field>
                <Field label="Alerte stock" required error={err.minStockAlert?.message}>
                  <input inputMode="numeric" className={inputClass} {...register("minStockAlert")} />
                </Field>
              </div>
            </div>
          </Panel>
          <Panel title="Garantie">
            <div className="space-y-4">
              <Field label="Garantie (FR)">
                <input className={inputClass} placeholder="2 ans" {...register("warrantyFr")} />
              </Field>
              <Field label="Garantie (AR)">
                <input className={inputClass} dir="rtl" placeholder="سنتان" {...register("warrantyAr")} />
              </Field>
            </div>
          </Panel>
        </div>
      </div>
    </form>
  );
}
