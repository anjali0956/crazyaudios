"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { AddToCartButton } from "@/app/components/cart/AddToCartButton";
import type { CartProductInput } from "@/app/components/cart/CartProvider";
import { WhatsAppLink } from "@/app/components/chrome/TrackedLink";
import { SUPPORT_HOURS } from "@/app/components/chrome/links";
import { IconBag, IconWhatsApp } from "@/app/components/icons";
import { DeliveryCheck } from "@/app/components/product/DeliveryCheck";
import { STICKY_BAR_HEIGHT, StickyBuyBar } from "@/app/components/product/StickyBuyBar";
import type { PdpBuyProduct } from "@/app/components/product/types";
import { QuantityStepper } from "@/app/components/ui/QuantityStepper";
import { useBottomBar } from "@/app/components/ui/useBottomBar";
import { trackPixelEvent } from "@/lib/meta-pixel";
import { getDisplayPrice } from "@/lib/order-utils";

// Below 1024px the page shows the sticky buy bar instead of the floating
// WhatsApp button (which could otherwise sit on top of "Add to cart").
const MOBILE_QUERY = "(max-width: 1023.98px)";

function subscribeMobile(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const isMobileNow = () => window.matchMedia(MOBILE_QUERY).matches;

/**
 * The interactive part of the product page: quantity, Add to cart, WhatsApp,
 * the delivery check and the mobile sticky buy bar. Also reports the Meta
 * ViewContent event (same payload as before the redesign, once per product view).
 * Everything else on the page is server-rendered.
 */
export default function ProductDetailsClient({
  product,
  askHref,
  restockHref,
  complement,
}: {
  product: PdpBuyProduct;
  /** WhatsApp chat about this product. */
  askHref: string;
  /** WhatsApp chat asking when an out-of-stock product is back. */
  restockHref: string;
  /** Complementary-part card, rendered between the buy buttons and the delivery check. */
  complement?: ReactNode;
}) {
  const [quantity, setQuantity] = useState(product.minQty);
  const [buyOffscreen, setBuyOffscreen] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);
  const viewSent = useRef<string | null>(null);
  const mobile = useSyncExternalStore(subscribeMobile, isMobileNow, () => false);
  const inStock = product.stock >= product.minQty;

  // Raw stored values: the cart store prices them and sends the Meta AddToCart event.
  const cartProduct = useMemo<CartProductInput>(
    () => ({
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      stock: product.stock,
      packSize: product.packSize,
      flashSale: product.flashSale,
      discountPercentage: product.discountPercentage,
      category: product.category,
    }),
    [product]
  );

  // Meta ViewContent: identical parameters to the pre-redesign page, sent once per product.
  useEffect(() => {
    if (viewSent.current === product._id) return;
    viewSent.current = product._id;
    const { inclusiveFinalPrice } = getDisplayPrice(
      product.price,
      product.discountPercentage || 0,
      Boolean(product.flashSale)
    );
    trackPixelEvent("ViewContent", {
      content_ids: [product._id],
      content_type: "product",
      content_name: product.name,
      content_category: product.category || "",
      value: inclusiveFinalPrice,
      currency: "INR",
    });
  }, [product._id, product.name, product.category, product.price, product.discountPercentage, product.flashSale]);

  // The sticky bar shows while the page's own buy buttons are not fully on screen.
  useEffect(() => {
    const target = buyRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setBuyOffscreen(!(entry.isIntersecting && entry.intersectionRatio > 0.98)),
      { rootMargin: "-56px 0px 0px 0px", threshold: [0, 1] }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const barVisible = mobile && buyOffscreen;
  // On phones the floating WhatsApp button stays hidden on this page (the page
  // and the bar carry their own WhatsApp actions); toasts sit above the bar.
  useBottomBar(mobile, barVisible ? STICKY_BAR_HEIGHT : 0);

  // Keep the end of the page (footer links) clear of the bar. Reserved for as
  // long as the page is on a phone, so the page height never jumps while scrolling.
  useEffect(() => {
    if (!mobile) return;
    const body = document.body;
    const previous = body.style.paddingBottom;
    body.style.paddingBottom = `calc(${STICKY_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`;
    return () => {
      body.style.paddingBottom = previous;
    };
  }, [mobile]);

  return (
    <>
      {inStock ? (
        <>
          <div ref={buyRef} className="mt-5 flex items-stretch gap-2.5 sm:gap-3">
            <QuantityStepper
              size="lg"
              value={quantity}
              onChange={setQuantity}
              step={product.minQty}
              min={product.minQty}
              max={product.stock}
              label={`Quantity for ${product.title}`}
            />
            <AddToCartButton
              product={cartProduct}
              quantity={quantity}
              variant="primary"
              size="lg"
              className="min-w-0 flex-1"
              icon={<IconBag size={20} />}
              label="Add to cart"
            />
          </div>
          {product.minQty > 1 ? (
            <p className="mt-2 text-[13px] leading-[18px] text-muted">
              Quantity is in pieces, sold in packs of {product.minQty}.
            </p>
          ) : null}
          <WhatsAppLink
            href={askHref}
            source="product_page"
            contentName={product.name}
            className="mt-2.5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-card border border-whatsapp/50 bg-card px-4 text-[15px] font-semibold text-ok transition-colors duration-150 hover:border-whatsapp hover:bg-ok-soft/40"
          >
            <IconWhatsApp size={20} className="shrink-0 text-whatsapp" />
            Ask about this part on WhatsApp
          </WhatsAppLink>
        </>
      ) : (
        <div ref={buyRef} className="mt-5">
          <WhatsAppLink
            href={restockHref}
            source="product_page"
            contentName={product.name}
            className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-card bg-ink px-5 text-[16px] font-semibold text-white transition-colors duration-150 hover:bg-ink-2"
          >
            <IconWhatsApp size={20} className="shrink-0 text-whatsapp" />
            Ask on WhatsApp when it’s back
          </WhatsAppLink>
          <p className="mt-2 text-[13px] leading-[18px] text-muted">We reply on WhatsApp {SUPPORT_HOURS}.</p>
        </div>
      )}

      {complement}

      {inStock ? (
        <DeliveryCheck className="mt-4" productId={product._id} quantity={quantity} unitPrice={product.unitPrice} />
      ) : null}

      <StickyBuyBar
        visible={barVisible}
        product={product}
        cartProduct={cartProduct}
        quantity={quantity}
        askHref={askHref}
        restockHref={restockHref}
      />
    </>
  );
}
