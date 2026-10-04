"use client";

import { AddToCartButton } from "@/app/components/cart/AddToCartButton";
import type { CartProductInput } from "@/app/components/cart/CartProvider";
import { WhatsAppLink } from "@/app/components/chrome/TrackedLink";
import { IconBag, IconWhatsApp } from "@/app/components/icons";
import { stockLevel } from "@/app/components/ui/StockStatus";
import { cx } from "@/app/components/ui/cx";
import { formatINR } from "@/lib/format";
import type { PdpBuyProduct } from "./types";

/** Bar height in px (68px row + 1px top border); the safe-area inset is added in CSS. */
export const STICKY_BAR_HEIGHT = 69;

const TONE = { out: "text-danger", low: "text-warn", in: "text-ok" } as const;

/**
 * Mobile buy bar (hidden from 1024px): price, stock, Add to cart and a
 * WhatsApp action. The parent shows it while the page's own buy buttons are
 * off screen; when hidden it is inert, so it cannot be tabbed into.
 */
export function StickyBuyBar({
  visible,
  product,
  cartProduct,
  quantity,
  askHref,
  restockHref,
}: {
  visible: boolean;
  product: PdpBuyProduct;
  cartProduct: CartProductInput;
  quantity: number;
  askHref: string;
  restockHref: string;
}) {
  const { level, count, packs } = stockLevel(product.stock, product.packSize ?? 1);
  const unit = packs ? (count === 1 ? " pack" : " packs") : "";
  const stockText = level === "out" ? "Out of stock" : level === "low" ? `Only ${count}${unit} left` : "In stock";
  const inStock = level !== "out";

  return (
    <div
      role="region"
      aria-label="Buy this part"
      aria-hidden={visible ? undefined : true}
      inert={!visible}
      className={cx(
        "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] shadow-raised",
        "transition-[transform,visibility] duration-200 ease-out motion-reduce:transition-none lg:hidden",
        visible ? "visible translate-y-0" : "invisible translate-y-full"
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-[640px] items-center gap-2.5 px-3 sm:px-4">
        <div className="min-w-[64px] shrink-0">
          <p className="type-price whitespace-nowrap text-[19px] leading-6 text-ink">
            {formatINR(product.sellPrice)}
            {product.minQty > 1 ? <span className="text-[12px] font-medium text-ink-2"> /pack</span> : null}
          </p>
          <p className={cx("whitespace-nowrap text-[12px] font-semibold leading-4", TONE[level])}>{stockText}</p>
        </div>
        {inStock ? (
          <>
            <AddToCartButton
              product={cartProduct}
              quantity={quantity}
              variant="primary"
              size="lg"
              className="min-w-0 flex-1"
              icon={<IconBag size={20} />}
              label="Add to cart"
            />
            <WhatsAppLink
              href={askHref}
              source="product_page"
              contentName={product.name}
              aria-label="Ask about this part on WhatsApp"
              className="grid h-13 w-13 shrink-0 place-items-center rounded-card border border-whatsapp/50 bg-card text-whatsapp transition-colors duration-150 hover:border-whatsapp"
            >
              <IconWhatsApp size={24} />
            </WhatsAppLink>
          </>
        ) : (
          <WhatsAppLink
            href={restockHref}
            source="product_page"
            contentName={product.name}
            className="inline-flex h-13 min-w-0 flex-1 items-center justify-center gap-2 rounded-card bg-ink px-4 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-ink-2"
          >
            <IconWhatsApp size={20} className="shrink-0 text-whatsapp" />
            <span className="truncate">Ask when it’s back</span>
          </WhatsAppLink>
        )}
      </div>
    </div>
  );
}
