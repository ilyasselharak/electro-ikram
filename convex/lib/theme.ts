import type { Theme } from "./validators";

/** Current look of the store, used when no theme has been saved. */
export const DEFAULT_THEME: Theme = {
  primary: "#1f5fd6",
  dark: "#14213d",
  sale: "#e5484d",
  radius: 0.75,
  font: "manrope",
  cardStyle: "bordered",
  headerStyle: "light",
};

export const THEME_PRESETS: { id: string; name: string; theme: Theme }[] = [
  { id: "electric", name: "Bleu électrique", theme: DEFAULT_THEME },
  { id: "emerald", name: "Émeraude", theme: { ...DEFAULT_THEME, primary: "#0f8a5f", dark: "#0b2e24", sale: "#e5484d", font: "inter" } },
  { id: "sunset", name: "Orange vif", theme: { ...DEFAULT_THEME, primary: "#ea580c", dark: "#1c1917", sale: "#dc2626", radius: 1, font: "poppins", cardStyle: "elevated" } },
  { id: "royal", name: "Violet royal", theme: { ...DEFAULT_THEME, primary: "#6d28d9", dark: "#1e1537", sale: "#e11d48", font: "dm-sans", cardStyle: "elevated" } },
  { id: "noir", name: "Noir & or", theme: { ...DEFAULT_THEME, primary: "#b8860b", dark: "#111111", sale: "#c2410c", radius: 0.375, font: "inter", cardStyle: "minimal", headerStyle: "dark" } },
  { id: "red", name: "Rouge Maroc", theme: { ...DEFAULT_THEME, primary: "#c1272d", dark: "#1a1a2e", sale: "#c1272d", font: "poppins", cardStyle: "bordered" } },
];

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Black or white text, whichever reads better on `hex`. */
export function readableOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? "#111827" : "#ffffff";
}

/** CSS custom properties that apply a theme over the default tokens in globals.css. */
export function themeCss(t: Theme, selector = "html:root") {
  const vars: Record<string, string> = {
    "--primary": t.primary,
    "--primary-foreground": readableOn(t.primary),
    "--ring": t.primary,
    "--chart-1": t.primary,
    "--accent": `color-mix(in oklch, ${t.primary} 9%, white)`,
    "--accent-foreground": `color-mix(in oklch, ${t.primary} 80%, black)`,
    "--navy": t.dark,
    "--sale": t.sale,
    "--radius": `${t.radius}rem`,
    "--font-latin": `var(--font-${t.font})`,
  };
  return `${selector}{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`;
}

export function isValidTheme(t: Theme) {
  return HEX_RE.test(t.primary) && HEX_RE.test(t.dark) && HEX_RE.test(t.sale) && t.radius >= 0 && t.radius <= 1.5;
}
