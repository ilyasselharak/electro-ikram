import type { Metadata } from "next";
import { Manrope, IBM_Plex_Sans_Arabic } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { AdminConvexProvider } from "@/providers/admin-convex-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "../globals.css";

const latin = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600"], variable: "--font-arabic", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Admin Electro-Ikram" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="fr" dir="ltr" className={`${latin.variable} ${arabic.variable}`}>
        <body className="min-h-dvh bg-secondary/50 text-foreground antialiased">
          <AdminConvexProvider>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
            <Toaster position="top-right" richColors closeButton />
          </AdminConvexProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
