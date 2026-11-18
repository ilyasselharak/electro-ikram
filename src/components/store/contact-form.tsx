"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { errorData } from "@/lib/convex-errors";
import { PHONE_RE } from "@/lib/morocco";

export function ContactForm() {
  const t = useTranslations();
  const send = useMutation(api.messages.sendContact);
  const [sent, setSent] = useState(false);

  const schema = z
    .object({
      name: z.string().trim().min(2, t("validation.min", { count: 2 })).max(120),
      phone: z.union([z.literal(""), z.string().trim().regex(PHONE_RE, t("validation.phone"))]),
      email: z.union([z.literal(""), z.email(t("validation.email"))]),
      subject: z.string().trim().min(3, t("validation.min", { count: 3 })).max(200),
      message: z.string().trim().min(10, t("validation.min", { count: 10 })).max(4000, t("validation.max", { count: 4000 })),
    })
    .refine((v) => v.phone || v.email, { message: t("contact.phoneOrEmail"), path: ["phone"] });
  type Values = z.infer<typeof schema>;

  const { register, handleSubmit, formState, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", email: "", subject: "", message: "" },
    mode: "onTouched",
  });
  const err = formState.errors;

  if (sent) {
    return (
      <div className="flex flex-col items-center rounded-2xl border bg-success/5 p-10 text-center">
        <CheckCircle2 className="size-12 text-success" />
        <p className="mt-4 font-semibold text-navy">{t("contact.sent")}</p>
        <Button variant="outline" className="mt-6 rounded-xl" onClick={() => setSent(false)}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (v) => {
        try {
          await send({ name: v.name, phone: v.phone || undefined, email: v.email || undefined, subject: v.subject, message: v.message });
          reset();
          setSent(true);
        } catch (e) {
          const code = errorData(e).code;
          toast.error(code === "RATE_LIMITED" ? t("checkout.errors.RATE_LIMITED") : t("common.error"));
        }
      })}
      className="grid gap-4 rounded-2xl border p-5 sm:grid-cols-2 sm:p-7"
    >
      <Field label={t("contact.name")} htmlFor="c-name" error={err.name?.message} required className="sm:col-span-2">
        <input id="c-name" autoComplete="name" className={inputClass} aria-invalid={!!err.name} {...register("name")} />
      </Field>
      <Field label={t("contact.phone")} htmlFor="c-phone" error={err.phone?.message}>
        <input id="c-phone" type="tel" dir="ltr" autoComplete="tel" className={`${inputClass} rtl:text-right`} aria-invalid={!!err.phone} {...register("phone")} />
      </Field>
      <Field label={t("contact.email")} htmlFor="c-email" error={err.email?.message}>
        <input id="c-email" type="email" dir="ltr" autoComplete="email" className={`${inputClass} rtl:text-right`} aria-invalid={!!err.email} {...register("email")} />
      </Field>
      <Field label={t("contact.subject")} htmlFor="c-subject" error={err.subject?.message} required className="sm:col-span-2">
        <input id="c-subject" className={inputClass} aria-invalid={!!err.subject} {...register("subject")} />
      </Field>
      <Field label={t("contact.message")} htmlFor="c-message" error={err.message?.message} required className="sm:col-span-2">
        <textarea id="c-message" rows={6} className={`${inputClass} h-auto py-2.5`} aria-invalid={!!err.message} {...register("message")} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={formState.isSubmitting} className="h-12 rounded-xl px-8 text-base">
          {formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="rtl-flip size-4" />}
          {formState.isSubmitting ? t("contact.sending") : t("contact.send")}
        </Button>
      </div>
    </form>
  );
}
