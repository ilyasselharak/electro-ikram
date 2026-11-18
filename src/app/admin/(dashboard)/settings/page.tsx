"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Loader2, Save } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { RequirePermission } from "@/components/admin/admin-shell";
import { SingleImageUpload } from "@/components/admin/image-uploader";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { toast } from "sonner";

type Settings = FunctionReturnType<typeof api.settings.adminGet>;
const str = (v?: string) => v ?? "";
const opt = (v: string) => v.trim() || undefined;
const optNum = (v: string) => (v.trim() ? Number(v) : undefined);

function SettingsEditor({ s }: { s: Settings }) {
  const [f, setF] = useState({
    storeName: s.storeName,
    logo: s.logo,
    favicon: s.favicon,
    phone: str(s.phone),
    whatsapp: str(s.whatsapp),
    email: str(s.email),
    notifyEmail: str(s.notifyEmail),
    addressFr: str(s.addressFr),
    addressAr: str(s.addressAr),
    city: str(s.city),
    facebook: str(s.social.facebook),
    instagram: str(s.social.instagram),
    tiktok: str(s.social.tiktok),
    youtube: str(s.social.youtube),
    x: str(s.social.x),
    currency: s.currency,
    defaultLanguage: s.defaultLanguage,
    availableLanguages: s.availableLanguages,
    deliveryFee: String(s.deliveryFee),
    freeDeliveryThreshold: s.freeDeliveryThreshold?.toString() ?? "",
    minOrderAmount: s.minOrderAmount?.toString() ?? "",
    deliveryDelayFr: str(s.deliveryDelayFr),
    deliveryDelayAr: str(s.deliveryDelayAr),
    announcementEnabled: s.announcement.enabled,
    announcementFr: str(s.announcement.textFr),
    announcementAr: str(s.announcement.textAr),
    announcementLink: str(s.announcement.link),
    businessHoursFr: str(s.businessHoursFr),
    businessHoursAr: str(s.businessHoursAr),
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const save = useAdminMutation(api.settings.update, { success: "Paramètres enregistrés" });

  const submit = () => {
    if (!f.storeName.trim()) return toast.error("Le nom de la boutique est requis.");
    if (!(Number(f.deliveryFee) >= 0)) return toast.error("Frais de livraison invalides.");
    save.run({
      storeName: f.storeName.trim(),
      logo: f.logo,
      favicon: f.favicon,
      phone: opt(f.phone),
      whatsapp: opt(f.whatsapp),
      email: opt(f.email),
      notifyEmail: opt(f.notifyEmail),
      addressFr: opt(f.addressFr),
      addressAr: opt(f.addressAr),
      city: opt(f.city),
      social: { facebook: opt(f.facebook), instagram: opt(f.instagram), tiktok: opt(f.tiktok), youtube: opt(f.youtube), x: opt(f.x) },
      currency: f.currency,
      defaultLanguage: f.defaultLanguage,
      availableLanguages: f.availableLanguages,
      deliveryFee: Number(f.deliveryFee),
      freeDeliveryThreshold: optNum(f.freeDeliveryThreshold),
      minOrderAmount: optNum(f.minOrderAmount),
      deliveryDelayFr: opt(f.deliveryDelayFr),
      deliveryDelayAr: opt(f.deliveryDelayAr),
      announcement: { enabled: f.announcementEnabled, textFr: opt(f.announcementFr), textAr: opt(f.announcementAr), link: opt(f.announcementLink) },
      businessHoursFr: opt(f.businessHoursFr),
      businessHoursAr: opt(f.businessHoursAr),
    });
  };

  const input = (key: keyof typeof f, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input className={inputClass} value={f[key] as string} onChange={(e) => set({ [key]: e.target.value } as Partial<typeof f>)} {...props} />
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Identité">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de la boutique" required className="sm:col-span-2">{input("storeName")}</Field>
            <Field label="Logo" hint="PNG/SVG transparent, ~360 × 96"><SingleImageUpload folder="settings" value={f.logo} onChange={(logo) => set({ logo })} aspect="aspect-[3/1]" /></Field>
            <Field label="Favicon" hint="Carré, 512 × 512"><SingleImageUpload folder="settings" value={f.favicon} onChange={(favicon) => set({ favicon })} aspect="aspect-square max-w-28" /></Field>
          </div>
        </Panel>
        <Panel title="Coordonnées">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Téléphone">{input("phone", { placeholder: "05 22 00 00 00" })}</Field>
            <Field label="WhatsApp" hint="Numéro utilisé pour les boutons WhatsApp">{input("whatsapp", { placeholder: "06 00 00 00 00" })}</Field>
            <Field label="E-mail public">{input("email", { type: "email" })}</Field>
            <Field label="E-mail de notification des commandes" hint="Nécessite AUTH_RESEND_KEY">{input("notifyEmail", { type: "email" })}</Field>
            <Field label="Adresse (FR)">{input("addressFr")}</Field>
            <Field label="Adresse (AR)">{input("addressAr", { dir: "rtl" })}</Field>
            <Field label="Ville">{input("city")}</Field>
          </div>
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Livraison et commandes">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Frais de livraison (DH)">{input("deliveryFee", { inputMode: "decimal" })}</Field>
            <Field label="Livraison gratuite dès (DH)" hint="Vide = jamais">{input("freeDeliveryThreshold", { inputMode: "decimal" })}</Field>
            <Field label="Commande minimum (DH)" hint="Vide = aucun">{input("minOrderAmount", { inputMode: "decimal" })}</Field>
            <Field label="Délai de livraison (FR)" className="sm:col-span-3">{input("deliveryDelayFr")}</Field>
            <Field label="Délai de livraison (AR)" className="sm:col-span-3">{input("deliveryDelayAr", { dir: "rtl" })}</Field>
          </div>
        </Panel>
        <Panel title="Barre d'annonce">
          <div className="space-y-4">
            <label className="flex items-center justify-between rounded-xl border p-3 text-sm font-medium">Afficher la barre d&apos;annonce <Switch checked={f.announcementEnabled} onCheckedChange={(v) => set({ announcementEnabled: v })} /></label>
            <Field label="Texte (FR)">{input("announcementFr")}</Field>
            <Field label="Texte (AR)">{input("announcementAr", { dir: "rtl" })}</Field>
            <Field label="Lien (optionnel)">{input("announcementLink", { placeholder: "/fr/offers" })}</Field>
          </div>
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Réseaux sociaux">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Facebook">{input("facebook", { type: "url", placeholder: "https://facebook.com/…" })}</Field>
            <Field label="Instagram">{input("instagram", { type: "url" })}</Field>
            <Field label="TikTok">{input("tiktok", { type: "url" })}</Field>
            <Field label="YouTube">{input("youtube", { type: "url" })}</Field>
            <Field label="X / Twitter">{input("x", { type: "url" })}</Field>
          </div>
        </Panel>
        <Panel title="Langues, devise et horaires">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Devise"><select className={inputClass} value={f.currency} onChange={(e) => set({ currency: e.target.value })}><option value="MAD">MAD (DH)</option></select></Field>
            <Field label="Langue par défaut">
              <select className={inputClass} value={f.defaultLanguage} onChange={(e) => set({ defaultLanguage: e.target.value as "fr" | "ar" })}>
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
            </Field>
            <Field label="Langues disponibles" className="sm:col-span-2" hint="Les deux langues sont servies sur /fr et /ar.">
              <div className="flex gap-4 text-sm">
                {(["fr", "ar"] as const).map((l) => (
                  <label key={l} className="flex items-center gap-2">
                    <Checkbox checked={f.availableLanguages.includes(l)} onCheckedChange={(v) => set({ availableLanguages: v ? [...new Set([...f.availableLanguages, l])] : f.availableLanguages.filter((x) => x !== l) })} />
                    {l === "fr" ? "Français" : "العربية"}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Horaires (FR)">{input("businessHoursFr")}</Field>
            <Field label="Horaires (AR)">{input("businessHoursAr", { dir: "rtl" })}</Field>
          </div>
        </Panel>
      </div>
      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={submit} disabled={save.pending} className="shadow-lg">
          {save.pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
}

function SettingsInner() {
  const s = useQuery(api.settings.adminGet);
  return s ? <SettingsEditor s={s} /> : <Skeleton className="h-[600px] rounded-2xl" />;
}

export default function SettingsPage() {
  return (
    <RequirePermission perm="settings">
      <PageHeader title="Paramètres de la boutique" description="Identité, coordonnées, livraison et affichage." />
      <SettingsInner />
    </RequirePermission>
  );
}
