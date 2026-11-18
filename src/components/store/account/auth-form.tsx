"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "login" | "register" | "reset";

const PASSWORD_OK = (p: string) => p.length >= 8 && /\d/.test(p) && /[a-zA-Z]/.test(p);

/** Only same-site paths are allowed as a post-login destination. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export function AuthForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "register" ? "register" : "login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", code: "" });
  const [codeSent, setCodeSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (isAuthenticated) router.replace(next);
  }, [isAuthenticated, next, router]);

  const fail = (e: unknown, fallback: string) => {
    const msg = e instanceof Error ? e.message : "";
    if (/already exists/i.test(msg)) setError(t("exists"));
    else if (/caractères|password/i.test(msg) && mode !== "login") setError(t("weakPassword"));
    else setError(fallback);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const email = form.email.trim().toLowerCase();
    if (mode === "register") {
      if (form.name.trim().length < 2) return setError(t("name"));
      if (!PASSWORD_OK(form.password)) return setError(t("weakPassword"));
    }
    setPending(true);
    try {
      if (mode === "login") {
        await signIn("password", { flow: "signIn", email, password: form.password });
      } else if (mode === "register") {
        await signIn("password", { flow: "signUp", email, password: form.password, name: form.name.trim() });
        toast.success(t("welcome", { name: form.name.trim().split(/\s+/)[0] }));
      } else if (!codeSent) {
        await signIn("password", { flow: "reset", email });
        setCodeSent(true);
        toast.success(t("codeSent"));
      } else {
        if (!PASSWORD_OK(form.password)) {
          setPending(false);
          return setError(t("weakPassword"));
        }
        await signIn("password", { flow: "reset-verification", email, code: form.code.trim(), newPassword: form.password });
        toast.success(t("resetDone"));
      }
    } catch (err) {
      fail(err, mode === "login" ? t("invalid") : mode === "reset" ? t("resetFailed") : t("exists"));
    } finally {
      setPending(false);
    }
  };

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setCodeSent(false);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      {mode !== "reset" ? (
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-secondary p-1" role="tablist">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchTo(m)}
              className={cn("h-10 rounded-lg text-sm font-semibold transition", mode === m ? "bg-white text-navy shadow-sm" : "text-muted-foreground hover:text-navy")}
            >
              {m === "login" ? t("loginTab") : t("registerTab")}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-navy">{t("resetTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("resetIntro")}</p>
        </div>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        {mode === "register" && (
          <Field label={t("name")} htmlFor="name" required>
            <div className="relative">
              <UserRound className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input id="name" autoComplete="name" value={form.name} onChange={set("name")} className={`${inputClass} ps-10`} />
            </div>
          </Field>
        )}
        <Field label={t("email")} htmlFor="email" required>
          <div className="relative">
            <Mail className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={form.email}
              onChange={set("email")}
              disabled={mode === "reset" && codeSent}
              className={`${inputClass} ps-10 rtl:text-right`}
            />
          </div>
        </Field>
        {mode === "reset" && codeSent && (
          <Field label={t("code")} htmlFor="code" required>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" dir="ltr" value={form.code} onChange={set("code")} className={`${inputClass} tracking-[0.3em]`} />
          </Field>
        )}
        {(mode !== "reset" || codeSent) && (
          <Field
            label={mode === "reset" ? t("newPassword") : t("password")}
            htmlFor="password"
            hint={mode !== "login" ? t("passwordHint") : undefined}
            required
          >
            <div className="relative">
              <Lock className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type="password"
                dir="ltr"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={form.password}
                onChange={set("password")}
                className={`${inputClass} ps-10 rtl:text-right`}
              />
            </div>
          </Field>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="h-12 w-full rounded-xl text-base font-semibold">
          {pending && <Loader2 className="size-5 animate-spin" />}
          {mode === "login" ? t("submitLogin") : mode === "register" ? t("submitRegister") : codeSent ? t("resetSubmit") : t("sendCode")}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
        {mode === "login" ? (
          <button type="button" onClick={() => switchTo("reset")} className="font-medium text-primary hover:underline">
            {t("forgot")}
          </button>
        ) : mode === "reset" ? (
          <button type="button" onClick={() => switchTo("login")} className="font-medium text-primary hover:underline">
            {t("backToLogin")}
          </button>
        ) : (
          <span />
        )}
        <Link href="/checkout" className="text-muted-foreground hover:text-primary">
          {t("guestCheckout")}
        </Link>
      </div>
    </div>
  );
}
