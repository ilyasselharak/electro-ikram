import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function SectionHeader({ title, subtitle, href, linkLabel }: { title: string; subtitle?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        <h2 className="text-xl font-bold text-navy sm:text-2xl lg:text-[1.7rem]">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground sm:text-[15px]">{subtitle}</p>}
      </div>
      {href && linkLabel && (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80">
          {linkLabel}
          <ArrowRight className="rtl-flip size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
