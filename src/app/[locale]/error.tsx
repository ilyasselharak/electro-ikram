"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <div className="mb-6 grid size-20 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-9" />
      </div>
      <h1 className="text-2xl font-bold text-navy">{t("errors.genericTitle")}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t("errors.genericText")}</p>
      <Button onClick={reset} size="lg" className="mt-8 h-11 rounded-xl px-6">
        {t("common.retry")}
      </Button>
    </div>
  );
}
