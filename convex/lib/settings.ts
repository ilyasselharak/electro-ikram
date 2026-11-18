import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

export type StoreSettings = Omit<Doc<"storeSettings">, "_id" | "_creationTime">;

export const DEFAULT_SETTINGS: StoreSettings = {
  key: "main",
  storeName: "Electro-Ikram",
  phone: undefined,
  whatsapp: undefined,
  email: undefined,
  addressFr: undefined,
  addressAr: undefined,
  city: undefined,
  social: {},
  currency: "MAD",
  defaultLanguage: "fr",
  availableLanguages: ["fr", "ar"],
  deliveryFee: 30,
  freeDeliveryThreshold: 1500,
  minOrderAmount: undefined,
  deliveryDelayFr: "Livraison en 24 à 72 h partout au Maroc",
  deliveryDelayAr: "التوصيل خلال 24 إلى 72 ساعة في جميع أنحاء المغرب",
  announcement: {
    enabled: true,
    textFr: "Livraison gratuite dès 1 500 DH d'achat · Paiement à la livraison",
    textAr: "توصيل مجاني ابتداءً من 1500 درهم · الدفع عند الاستلام",
  },
  businessHoursFr: "Lun – Sam : 9h00 – 20h00",
  businessHoursAr: "الإثنين – السبت: 9:00 – 20:00",
  seo: {
    siteTitleFr: "Electro-Ikram — Électroménager et électronique au Maroc",
    siteTitleAr: "إلكترو إكرام — الأجهزة المنزلية والإلكترونيات في المغرب",
    siteDescriptionFr:
      "Réfrigérateurs, machines à laver, téléviseurs, climatiseurs et petit électroménager aux meilleurs prix. Livraison partout au Maroc et paiement à la livraison.",
    siteDescriptionAr:
      "ثلاجات، غسالات، تلفزيونات، مكيفات وأجهزة منزلية صغيرة بأفضل الأسعار. توصيل لجميع مدن المغرب والدفع عند الاستلام.",
    keywords: ["électroménager", "Maroc", "réfrigérateur", "machine à laver", "téléviseur", "climatiseur"],
    robotsIndex: true,
    robotsFollow: true,
  },
  updatedAt: 0,
};

export async function loadSettings(ctx: QueryCtx): Promise<StoreSettings> {
  const doc = await ctx.db
    .query("storeSettings")
    .withIndex("by_key", (q) => q.eq("key", "main"))
    .unique();
  if (!doc) return DEFAULT_SETTINGS;
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

export function computeDeliveryFee(settings: StoreSettings, subtotalAfterDiscount: number) {
  if (
    settings.freeDeliveryThreshold !== undefined &&
    settings.freeDeliveryThreshold > 0 &&
    subtotalAfterDiscount >= settings.freeDeliveryThreshold
  ) {
    return 0;
  }
  return settings.deliveryFee;
}
