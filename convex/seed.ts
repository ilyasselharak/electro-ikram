import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { DEFAULT_SETTINGS } from "./lib/settings";
import { buildProductSearchText } from "./lib/catalog";
import { slugify } from "./lib/utils";

const CATEGORIES = [
  { nameFr: "Réfrigérateurs", nameAr: "الثلاجات", icon: "refrigerator" },
  { nameFr: "Congélateurs", nameAr: "المجمدات", icon: "snowflake" },
  { nameFr: "Machines à laver", nameAr: "الغسالات", icon: "washing-machine" },
  { nameFr: "Téléviseurs", nameAr: "التلفزيونات", icon: "tv" },
  { nameFr: "Climatiseurs", nameAr: "المكيفات", icon: "air-vent" },
  { nameFr: "Chauffe-eau", nameAr: "سخانات الماء", icon: "flame" },
  { nameFr: "Fours et cuisinières", nameAr: "الأفران والطباخات", icon: "cooking-pot" },
  { nameFr: "Petit électroménager", nameAr: "الأجهزة المنزلية الصغيرة", icon: "microwave" },
  { nameFr: "Aspirateurs", nameAr: "المكانس الكهربائية", icon: "wind" },
  { nameFr: "Mixeurs et robots de cuisine", nameAr: "الخلاطات وروبوتات المطبخ", icon: "chef-hat" },
];

/**
 * Initial store structure: settings, categories and homepage sections.
 * Idempotent — safe to run more than once.
 *   npx convex run seed:init
 */
export const init = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const settings = await ctx.db
      .query("storeSettings")
      .withIndex("by_key", (q) => q.eq("key", "main"))
      .unique();
    if (!settings) await ctx.db.insert("storeSettings", { ...DEFAULT_SETTINGS, updatedAt: now });

    const existingCats = await ctx.db.query("categories").collect();
    if (existingCats.length === 0) {
      for (let i = 0; i < CATEGORIES.length; i++) {
        const c = CATEGORIES[i];
        await ctx.db.insert("categories", {
          ...c,
          slug: slugify(c.nameFr),
          order: i,
          isActive: true,
          showInMenu: true,
          updatedAt: now,
        });
      }
    }

    const sections = await ctx.db.query("homepageSections").collect();
    if (sections.length === 0) {
      const defaults = [
        { type: "hero" as const },
        { type: "categories" as const, titleFr: "Nos catégories", titleAr: "تسوق حسب الفئة", limit: 10 },
        { type: "best_sellers" as const, titleFr: "Meilleures ventes", titleAr: "الأكثر مبيعاً", limit: 8 },
        { type: "promo_banners" as const },
        { type: "offers" as const, titleFr: "Offres spéciales", titleAr: "عروض خاصة", subtitleFr: "Des prix réduits sur une sélection d'appareils", subtitleAr: "تخفيضات على تشكيلة من الأجهزة", limit: 8 },
        { type: "new_arrivals" as const, titleFr: "Nouveautés", titleAr: "وصل حديثاً", limit: 8 },
        { type: "brands" as const, titleFr: "Nos marques", titleAr: "علاماتنا التجارية" },
        {
          type: "why_us" as const,
          titleFr: "Pourquoi choisir Electro-Ikram ?",
          titleAr: "لماذا تختار إلكترو إكرام؟",
          items: [
            { icon: "truck", titleFr: "Livraison partout au Maroc", titleAr: "توصيل لجميع المدن", textFr: "Expédition rapide et suivie jusqu'à votre porte.", textAr: "شحن سريع ومتتبع حتى باب منزلك." },
            { icon: "banknote", titleFr: "Paiement à la livraison", titleAr: "الدفع عند الاستلام", textFr: "Payez en espèces à la réception de votre commande.", textAr: "ادفع نقداً عند استلام طلبك." },
            { icon: "shield-check", titleFr: "Garantie officielle", titleAr: "ضمان رسمي", textFr: "Des produits neufs couverts par la garantie constructeur.", textAr: "منتجات جديدة مشمولة بضمان المصنع." },
            { icon: "headset", titleFr: "Conseil et service client", titleAr: "استشارة وخدمة العملاء", textFr: "Une équipe disponible par téléphone et WhatsApp.", textAr: "فريق متاح عبر الهاتف وواتساب." },
          ],
        },
        // Disabled until the admin adds real customer testimonials.
        { type: "testimonials" as const, titleFr: "Ils nous font confiance", titleAr: "آراء عملائنا", isEnabled: false, items: [] },
        { type: "newsletter" as const, titleFr: "Restez informé de nos offres", titleAr: "ابق على اطلاع بعروضنا" },
      ];
      for (let i = 0; i < defaults.length; i++) {
        const { isEnabled, ...rest } = defaults[i] as (typeof defaults)[number] & { isEnabled?: boolean };
        await ctx.db.insert("homepageSections", { ...rest, isEnabled: isEnabled ?? true, order: i });
      }
    }
    return "ok";
  },
});

const DEMO_BRANDS = ["Samsung", "LG", "Bosch", "Beko", "Whirlpool", "Haier"];

/**
 * OPTIONAL demo catalog for local development only (SKUs prefixed DEMO-).
 * Never run in production. Remove with `npx convex run seed:clearDemo`.
 */
export const demo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const brandIds: Record<string, Id<"brands">> = {};
    for (let i = 0; i < DEMO_BRANDS.length; i++) {
      const name = DEMO_BRANDS[i];
      const slug = slugify(name);
      const existing = await ctx.db.query("brands").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
      brandIds[name] =
        existing?._id ??
        (await ctx.db.insert("brands", { name, slug, isActive: true, isFeatured: true, order: i, updatedAt: now }));
    }
    const cats = await ctx.db.query("categories").collect();
    const cat = (nameFr: string) => cats.find((c) => c.nameFr === nameFr)!;
    const items = [
      { c: "Réfrigérateurs", b: "Samsung", fr: "Réfrigérateur combiné No Frost 340 L", ar: "ثلاجة مركبة بدون صقيع 340 لتر", price: 6490, old: 7290, stock: 12 },
      { c: "Réfrigérateurs", b: "LG", fr: "Réfrigérateur américain 600 L Inox", ar: "ثلاجة أمريكية 600 لتر ستانلس", price: 14990, old: undefined, stock: 4 },
      { c: "Machines à laver", b: "Bosch", fr: "Lave-linge frontal 8 kg 1400 tr/min", ar: "غسالة أمامية 8 كغ 1400 دورة", price: 5290, old: 5990, stock: 9 },
      { c: "Machines à laver", b: "Beko", fr: "Lave-linge 7 kg Inverter", ar: "غسالة 7 كغ إنفرتر", price: 3690, old: undefined, stock: 2 },
      { c: "Téléviseurs", b: "Samsung", fr: "Téléviseur 55\" 4K UHD Smart TV", ar: "تلفاز 55 بوصة 4K ذكي", price: 5990, old: 6990, stock: 15 },
      { c: "Téléviseurs", b: "LG", fr: "Téléviseur 43\" Full HD Smart TV", ar: "تلفاز 43 بوصة Full HD ذكي", price: 3290, old: undefined, stock: 0 },
      { c: "Climatiseurs", b: "Haier", fr: "Climatiseur split Inverter 12000 BTU", ar: "مكيف سبليت إنفرتر 12000 وحدة", price: 4890, old: 5490, stock: 7 },
      { c: "Chauffe-eau", b: "Whirlpool", fr: "Chauffe-eau électrique 80 L", ar: "سخان ماء كهربائي 80 لتر", price: 1690, old: undefined, stock: 20 },
      { c: "Fours et cuisinières", b: "Beko", fr: "Cuisinière 4 feux gaz avec four", ar: "طباخة غاز 4 شعلات مع فرن", price: 3190, old: 3490, stock: 6 },
      { c: "Petit électroménager", b: "Bosch", fr: "Micro-ondes 25 L avec grill", ar: "ميكروويف 25 لتر مع شواية", price: 1290, old: undefined, stock: 25 },
      { c: "Aspirateurs", b: "Samsung", fr: "Aspirateur sans sac 2000 W", ar: "مكنسة كهربائية بدون كيس 2000 واط", price: 1490, old: 1790, stock: 11 },
      { c: "Mixeurs et robots de cuisine", b: "Bosch", fr: "Robot de cuisine multifonction 1000 W", ar: "روبوت مطبخ متعدد الوظائف 1000 واط", price: 2190, old: undefined, stock: 8 },
    ];
    let n = 0;
    for (const it of items) {
      n++;
      const sku = `DEMO-${String(n).padStart(3, "0")}`;
      if (await ctx.db.query("products").withIndex("by_sku", (q) => q.eq("sku", sku)).first()) continue;
      const category = cat(it.c);
      const base = {
        nameFr: it.fr,
        nameAr: it.ar,
        sku,
        barcode: undefined,
        shortDescriptionFr: "Produit de démonstration — remplacez-le par votre catalogue réel.",
      };
      await ctx.db.insert("products", {
        ...base,
        slug: slugify(it.fr),
        descriptionFr: `${it.fr}. Produit de démonstration créé par le script de seed.`,
        descriptionAr: `${it.ar}. منتج تجريبي.`,
        shortDescriptionAr: "منتج تجريبي — استبدله بمنتجاتك الحقيقية.",
        brandId: brandIds[it.b],
        categoryId: category._id,
        purchasePrice: Math.round(it.price * 0.75),
        price: it.price,
        oldPrice: it.old,
        stock: it.stock,
        minStockAlert: 3,
        warrantyFr: "2 ans",
        warrantyAr: "سنتان",
        specs: [
          { labelFr: "Marque", labelAr: "العلامة", valueFr: it.b, valueAr: it.b },
          { labelFr: "Garantie", labelAr: "الضمان", valueFr: "2 ans", valueAr: "سنتان" },
        ],
        images: [],
        isFeatured: n % 3 === 0,
        isBestSeller: n % 4 === 1,
        status: "published",
        salesCount: 0,
        viewCount: 0,
        searchText: buildProductSearchText(base, it.b, [category.nameFr, category.nameAr]),
        updatedAt: now,
      });
    }
    return `${items.length} demo products`;
  },
});

export const clearDemo = internalMutation({
  args: { includeBrands: v.optional(v.boolean()) },
  handler: async (ctx, { includeBrands }) => {
    const products = await ctx.db.query("products").collect();
    let removed = 0;
    for (const p of products) {
      if (p.sku.startsWith("DEMO-")) {
        await ctx.db.delete(p._id);
        removed++;
      }
    }
    if (includeBrands) {
      for (const name of DEMO_BRANDS) {
        const b = await ctx.db.query("brands").withIndex("by_slug", (q) => q.eq("slug", slugify(name))).unique();
        if (b) await ctx.db.delete(b._id);
      }
    }
    return `${removed} demo products removed`;
  },
});
