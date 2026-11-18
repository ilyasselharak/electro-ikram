"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { MAX_QTY, useCart } from "@/stores/cart";
import { formatPrice, whatsappLink } from "@/lib/format";
import { useStoreSettings } from "@/providers/store-settings";
import { AddToCartButton, toCartItem, type CartableProduct } from "../add-to-cart-button";
import { QuantityInput } from "./quantity-input";
import { WhatsappIcon } from "../whatsapp-fab";
import { cn } from "@/lib/utils";

export function PurchasePanel({ product }: { product: CartableProduct }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const settings = useStoreSettings();
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.items.find((i) => i.productId === product._id)?.quantity ?? 0);
  const [qty, setQty] = useState(1);
  const [showSticky, setShowSticky] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const out = product.stock <= 0;
  const max = Math.max(1, Math.min(product.stock, MAX_QTY) - inCart);
  const name = locale === "ar" ? product.nameAr : product.nameFr;

  useEffect(() => {
    const el = anchor.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const buyNow = () => {
    if (inCart < qty) add(toCartItem(product), qty - inCart);
    router.push("/checkout");
  };

  const wa = whatsappLink(
    settings.whatsapp,
    t("product.whatsappMessage", { name, sku: product.sku, price: formatPrice(product.price, locale), qty }),
  );

  return (
    <div ref={anchor} className="space-y-3">
      {!out && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">{t("common.quantity")}</span>
          <QuantityInput value={Math.min(qty, max)} onChange={setQty} max={max} />
        </div>
      )}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <AddToCartButton product={product} quantity={Math.min(qty, max)} />
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={out}
          onClick={buyNow}
          className="h-12 rounded-xl border-navy text-base font-semibold text-navy hover:bg-navy hover:text-white"
        >
          <Zap className="size-4" /> {t("common.buyNow")}
        </Button>
      </div>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-base font-semibold text-white transition hover:bg-[#1fb857]"
        >
          <WhatsappIcon className="size-5" /> {t("product.orderWhatsapp")}
        </a>
      )}

      {/* Mobile sticky add-to-cart */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 shadow-[0_-8px_24px_-12px_rgb(15_27_51/0.2)] backdrop-blur transition-transform lg:hidden",
          showSticky ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!showSticky}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{name}</p>
            <p className="text-lg font-bold text-navy tabular-nums">{formatPrice(product.price, locale)}</p>
          </div>
          <AddToCartButton product={product} quantity={1} compact className="h-11 w-auto px-5" />
        </div>
      </div>
    </div>
  );
}
