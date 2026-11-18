import { useTranslations } from "next-intl";
import { SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <div className="mb-6 grid size-20 place-items-center rounded-2xl bg-accent text-primary">
        <SearchX className="size-9" />
      </div>
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold text-navy">{t("notFoundTitle")}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t("notFoundText")}</p>
      <Link href="/" className={buttonVariants({ size: "lg", className: "mt-8 h-11 rounded-xl px-6" })}>
        {t("backHome")}
      </Link>
    </div>
  );
}
