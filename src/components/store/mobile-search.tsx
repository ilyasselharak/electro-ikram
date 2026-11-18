"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SearchBox } from "./search-box";

export function MobileSearch() {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-xl text-navy hover:bg-accent md:hidden"
          aria-label={t("title")}
        >
          <Search className="size-[22px]" />
        </button>
      </SheetTrigger>
      <SheetContent side="top" className="p-4 pt-10">
        <SheetHeader className="sr-only">
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>
        <SearchBox autoFocus onNavigate={() => setOpen(false)} />
        <div className="h-[50vh]" />
      </SheetContent>
    </Sheet>
  );
}
