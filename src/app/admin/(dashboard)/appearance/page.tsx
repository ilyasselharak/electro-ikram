"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Check, ExternalLink, Heart, Loader2, RotateCcw, Save, Search, ShoppingBag, Star, UserRound } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { RequirePermission } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { DEFAULT_THEME, HEX_RE, THEME_PRESETS, readableOn, themeCss } from "@convex/lib/theme";
import type { Theme } from "@convex/lib/validators";
import { cn } from "@/lib/utils";

const FONTS: { id: Theme["font"]; label: string }[] = [
  { id: "manrope", label: "Manrope" },
  { id: "inter", label: "Inter" },
  { id: "poppins", label: "Poppins" },
  { id: "dm-sans", label: "DM Sans" },
];
const CARDS: { id: Theme["cardStyle"]; label: string; text: string }[] = [
  { id: "bordered", label: "Bordure", text: "Fine bordure, sobre" },
  { id: "elevated", label: "Ombre", text: "Cartes en relief" },
  { id: "minimal", label: "Minimal", text: "Sans cadre, épuré" },
];
const RADII = [
  { value: 0.25, label: "Carré" },
  { value: 0.5, label: "Léger" },
  { value: 0.75, label: "Arrondi" },
  { value: 1, label: "Doux" },
  { value: 1.25, label: "Très arrondi" },
];

function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="mt-2 flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-11 cursor-pointer rounded-lg border bg-white p-1" aria-label={label} />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (HEX_RE.test(e.target.value)) onChange(e.target.value.toLowerCase());
          }}
          className={cn("h-11 w-28 rounded-xl border px-3 font-mono text-sm uppercase outline-none focus:border-primary", !HEX_RE.test(text) && "border-destructive")}
          maxLength={7}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function Preview({ theme }: { theme: Theme }) {
  const dark = theme.headerStyle === "dark";
  const card = theme.cardStyle;
  return (
    <div className="theme-preview overflow-hidden rounded-2xl border bg-white" style={{ fontFamily: `var(--font-${theme.font}), sans-serif` }}>
      <style>{themeCss(theme, ".theme-preview")}</style>
      <div className="bg-navy py-1.5 text-center text-[11px] font-medium text-white">Livraison gratuite dès 1 500 DH · Paiement à la livraison</div>
      <div className={cn("flex items-center gap-3 border-b px-4 py-3", dark ? "bg-navy text-white" : "bg-white text-navy")}>
        <span className="text-base font-extrabold">Electro<span className="text-primary">-Ikram</span></span>
        <span className={cn("mx-auto hidden h-8 flex-1 items-center gap-2 rounded-[var(--radius)] border px-3 text-xs sm:flex", dark ? "border-white/15 text-white/60" : "text-muted-foreground")}>
          <Search className="size-3.5" /> Rechercher un produit…
        </span>
        <UserRound className="size-5" />
        <Heart className="size-5" />
        <ShoppingBag className="size-5" />
      </div>
      <div className={cn("flex gap-1 border-b px-4 py-2 text-xs", dark ? "bg-navy text-white/80" : "")}>
        <span className="rounded-[calc(var(--radius)*0.8)] bg-primary px-2.5 py-1 font-semibold text-primary-foreground">Toutes les catégories</span>
        <span className="px-2 py-1">Réfrigérateurs</span>
        <span className="px-2 py-1">TV</span>
        <span className="px-2 py-1 font-semibold text-sale">Promotions</span>
      </div>
      <div className="grid gap-3 bg-white p-4 sm:grid-cols-2">
        {[{ name: "Réfrigérateur combiné No Frost 340 L", price: "6 490 DH", old: "7 290 DH", off: "-11%" }, { name: "Lave-linge frontal 8 kg", price: "5 290 DH", old: null, off: null }].map((p) => (
          <div
            key={p.name}
            className={cn(
              "overflow-hidden rounded-[calc(var(--radius)*1.4)] bg-white",
              card === "bordered" && "border",
              card === "elevated" && "shadow-[0_1px_2px_rgb(15_27_51/0.06),0_8px_24px_-12px_rgb(15_27_51/0.25)]",
            )}
          >
            <div className="relative grid aspect-[4/3] place-items-center bg-secondary/60">
              <span className="text-4xl">🧊</span>
              {p.off && <span className="absolute start-2 top-2 rounded-md bg-sale px-1.5 py-0.5 text-[11px] font-bold text-white">{p.off}</span>}
              <span className="absolute end-2 top-2 grid size-7 place-items-center rounded-full bg-white shadow-sm"><Heart className="size-3.5" /></span>
            </div>
            <div className={cn("space-y-1.5 p-3", card === "minimal" && "px-1")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Samsung</p>
              <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
              <span className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className="size-3 text-amber-400" fill="currentColor" strokeWidth={0} />)}<span className="text-[11px] text-muted-foreground">(12)</span></span>
              <p className="text-base font-extrabold text-navy">
                {p.price} {p.old && <span className="text-xs font-normal text-muted-foreground line-through">{p.old}</span>}
              </p>
              <span className="flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--radius)] bg-primary text-xs font-semibold text-primary-foreground">
                <ShoppingBag className="size-3.5" /> Ajouter au panier
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Editor({ saved }: { saved: Theme }) {
  const [theme, setTheme] = useState<Theme>(saved);
  const save = useAdminMutation(api.settings.updateTheme, { success: "Apparence enregistrée : la boutique est à jour." });
  const set = (p: Partial<Theme>) => setTheme((t) => ({ ...t, ...p }));
  const dirty = JSON.stringify(theme) !== JSON.stringify(saved);
  const lowContrast = readableOn(theme.primary) === "#111827";

  return (
    <div>
      <PageHeader
        title="Apparence"
        description="Couleurs, typographie et style de la boutique. Les changements s'appliquent à tout le site dès l'enregistrement."
        actions={
          <>
            <Button variant="outline" asChild className="rounded-lg">
              <a href="/" target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> Voir la boutique</a>
            </Button>
            <Button variant="outline" className="rounded-lg" disabled={!dirty} onClick={() => setTheme(saved)}>
              <RotateCcw className="size-4" /> Annuler
            </Button>
            <Button className="rounded-lg" disabled={!dirty || save.pending} onClick={() => save.run({ theme })}>
              {save.pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <div className="space-y-6">
          <Panel title="Thèmes prêts à l'emploi" description="Un point de départ, que vous pouvez ensuite personnaliser.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {THEME_PRESETS.map((p) => {
                const active = JSON.stringify(p.theme) === JSON.stringify(theme);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTheme(p.theme)}
                    className={cn("rounded-xl border p-3 text-start transition hover:border-primary/40", active && "border-primary ring-2 ring-primary/20")}
                  >
                    <span className="flex h-10 overflow-hidden rounded-lg">
                      <span className="flex-[3]" style={{ background: p.theme.primary }} />
                      <span className="flex-[2]" style={{ background: p.theme.dark }} />
                      <span className="flex-1" style={{ background: p.theme.sale }} />
                    </span>
                    <span className="mt-2 flex items-center justify-between text-sm font-semibold">
                      {p.name} {active && <Check className="size-4 text-primary" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Couleurs">
            <div className="grid gap-6 sm:grid-cols-3">
              <ColorField label="Couleur principale" hint="Boutons, liens, badges" value={theme.primary} onChange={(primary) => set({ primary })} />
              <ColorField label="Couleur sombre" hint="Titres, bandeau, pied de page" value={theme.dark} onChange={(dark) => set({ dark })} />
              <ColorField label="Promotions" hint="Remises et prix barrés" value={theme.sale} onChange={(sale) => set({ sale })} />
            </div>
            {lowContrast && (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Couleur principale claire : le texte des boutons passera en noir pour rester lisible.
              </p>
            )}
          </Panel>

          <Panel title="Typographie et formes">
            <p className="text-sm font-medium">Police (texte latin)</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => set({ font: f.id })}
                  style={{ fontFamily: `var(--font-${f.id}), sans-serif` }}
                  className={cn("rounded-xl border p-3 text-start transition hover:border-primary/40", theme.font === f.id && "border-primary ring-2 ring-primary/20")}
                >
                  <span className="block text-2xl font-bold">Aa</span>
                  <span className="text-sm">{f.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Le texte arabe utilise toujours IBM Plex Sans Arabic.</p>

            <p className="mt-6 text-sm font-medium">Arrondi des coins</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {RADII.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set({ radius: r.value })}
                  className={cn("flex items-center gap-2 border px-3 py-2 text-sm transition hover:border-primary/40", theme.radius === r.value && "border-primary ring-2 ring-primary/20")}
                  style={{ borderRadius: `${r.value}rem` }}
                >
                  <span className="size-4 border-2 border-current" style={{ borderRadius: `${r.value * 0.5}rem` }} /> {r.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Mise en page">
            <p className="text-sm font-medium">Cartes produits</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {CARDS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set({ cardStyle: c.id })}
                  className={cn("rounded-xl border p-3 text-start transition hover:border-primary/40", theme.cardStyle === c.id && "border-primary ring-2 ring-primary/20")}
                >
                  <span className="block font-semibold">{c.label}</span>
                  <span className="text-xs text-muted-foreground">{c.text}</span>
                </button>
              ))}
            </div>
            <p className="mt-6 text-sm font-medium">En-tête</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([["light", "Clair", "Fond blanc"], ["dark", "Sombre", "Fond de la couleur sombre"]] as const).map(([id, label, text]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => set({ headerStyle: id })}
                  className={cn("rounded-xl border p-3 text-start transition hover:border-primary/40", theme.headerStyle === id && "border-primary ring-2 ring-primary/20")}
                >
                  <span className="block font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">{text}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <p className="mb-2 text-sm font-semibold text-muted-foreground">Aperçu en direct</p>
          <Preview theme={theme} />
          {dirty && <p className="mt-3 text-center text-xs text-muted-foreground">Modifications non enregistrées</p>}
        </div>
      </div>
    </div>
  );
}

function AppearanceInner() {
  const settings = useQuery(api.settings.adminGet);
  if (settings === undefined) return <Skeleton className="h-[600px] rounded-2xl" />;
  return <Editor saved={settings.theme ?? DEFAULT_THEME} />;
}

export default function AppearancePage() {
  return (
    <RequirePermission perm="settings">
      <AppearanceInner />
    </RequirePermission>
  );
}
