import type { ReactNode } from "react";
import { Logo } from "@/components/store/logo";

export function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-br from-secondary via-white to-accent/60 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border bg-white p-7 shadow-xl shadow-navy/5 sm:p-8">
          <h1 className="text-xl font-bold text-navy">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">© Electro-Ikram · Espace administrateur</p>
      </div>
    </div>
  );
}
