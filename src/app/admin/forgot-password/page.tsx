"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Loader2 } from "lucide-react";
import { AuthCard } from "@/components/admin/auth-card";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <AuthCard
      title="Réinitialiser le mot de passe"
      description={step === "request" ? "Recevez un code de vérification par e-mail." : `Saisissez le code envoyé à ${email}.`}
    >
      {step === "request" ? (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              await signIn("password", { email: email.trim().toLowerCase(), flow: "reset" });
              setStep("verify");
            } catch {
              setError("Impossible d'envoyer le code. Vérifiez l'adresse ou la configuration e-mail.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <Field label="E-mail" htmlFor="email">
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={loading} className="h-11 w-full rounded-xl">
            {loading && <Loader2 className="size-4 animate-spin" />} Envoyer le code
          </Button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
              setError("8 caractères minimum, avec au moins une lettre et un chiffre.");
              return;
            }
            setLoading(true);
            try {
              await signIn("password", { email: email.trim().toLowerCase(), code: code.trim(), newPassword: password, flow: "reset-verification" });
              router.replace("/admin");
              router.refresh();
            } catch {
              setError("Code invalide ou expiré.");
              setLoading(false);
            }
          }}
        >
          <Field label="Code de vérification" htmlFor="code">
            <input id="code" inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)} className={`${inputClass} tracking-[0.3em]`} />
          </Field>
          <Field label="Nouveau mot de passe" htmlFor="np" hint="8 caractères minimum, avec une lettre et un chiffre.">
            <input id="np" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </Field>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={loading} className="h-11 w-full rounded-xl">
            {loading && <Loader2 className="size-4 animate-spin" />} Changer le mot de passe
          </Button>
          <button type="button" onClick={() => setStep("request")} className="w-full text-sm text-muted-foreground hover:text-primary">
            Renvoyer un code
          </button>
        </form>
      )}
      <div className="mt-6 text-center">
        <Link href="/admin/login" className="text-sm text-primary hover:underline">
          ← Retour à la connexion
        </Link>
      </div>
    </AuthCard>
  );
}
