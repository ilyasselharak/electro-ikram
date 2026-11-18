import { DM_Sans, Inter, Manrope, Poppins } from "next/font/google";

// The same Latin fonts the storefront offers, so the preview shows the real typeface.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-poppins", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export default function AppearanceLayout({ children }: { children: React.ReactNode }) {
  return <div className={[manrope, inter, poppins, dmSans].map((f) => f.variable).join(" ")}>{children}</div>;
}
