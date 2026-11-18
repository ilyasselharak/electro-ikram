"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { api } from "@convex/_generated/api";
import { AuthCard } from "@/components/admin/auth-card";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const { signIn } = useAuthActions();
  const recordLogin = useMutation(api.users.recordLogin);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <AuthCard title="Connexion administrateur" description="Accédez au tableau de bord Electro-Ikram.">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLoading(true);
          try {
            await signIn("password", { email: email.trim().toLowerCase(), password, flow: "signIn" });
            await recordLogin({}).catch(() => {});
            const next = new URLSearchParams(window.location.search).get("next");
            router.replace(next && next.startsWith("/admin") ? next : "/admin");
            router.refresh();
          } catch {
            setError("E-mail ou mot de passe incorrect (ou trop de tentatives).");
            setLoading(false);
          }
        }}
      >
        <Field label="E-mail" htmlFor="email">
          <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Mot de passe" htmlFor="password">
          <div className="relative">
            <input
              id="password"
              type={show ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pe-11`}
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Afficher le mot de passe">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" size="lg" disabled={loading} className="h-11 w-full rounded-xl">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          Se connecter
        </Button>
        <div className="text-center">
          <Link href="/admin/forgot-password" className="text-sm text-primary hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
