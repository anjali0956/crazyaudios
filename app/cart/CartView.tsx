"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCart, type CartItem } from "@/app/components/cart/CartProvider";
import { currentItems, maxQuantity, packStep, writeItems } from "@/app/components/cart/cart-store";
import { FreeShippingMeter } from "@/app/components/checkout/FreeShippingMeter";
import { IconLock } from "@/app/components/checkout/icons";
import { OrderTotals } from "@/app/components/checkout/OrderTotals";
import { useCartValidation, type LineNotice, type RemovedLine } from "@/app/components/checkout/useCartValidation";
import { useInView, useIsCompact } from "@/app/components/checkout/useMediaQuery";
import { IconArrowLeft, IconArrowRight, IconCash, IconInfo, IconReceipt, IconTrash } from "@/app/components/icons";
import { ButtonLink } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";
import { ProductImage } from "@/app/components/ui/ProductImage";
import { QuantityStepper } from "@/app/components/ui/QuantityStepper";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { StockStatus, stockLevel } from "@/app/components/ui/StockStatus";
import { useToast } from "@/app/components/ui/Toast";
import { useBottomBar } from "@/app/components/ui/useBottomBar";
import { displayName } from "@/lib/display";
import { formatINR, pluralize } from "@/lib/format";
import { extractInclusiveTaxAmount } from "@/lib/order-utils";
import { COD_ENABLED, COD_MAX_ORDER_VALUE, isCodAllowed, qualifiesForFreeShipping } from "@/lib/shipping-policy";

const BAR_HEIGHT = 76;

export function CartView({ emptyState }: { emptyState: ReactNode }) {
  const { items, ready, subtotal, count, updateQty, remove } = useCart();
  const check = useCartValidation();
  const toast = useToast();
  const compact = useIsCompact();
  const [checkoutRef, checkoutVisible] = useInView<HTMLDivElement>(false);

  const hasItems = ready && items.length > 0;
  const showBar = hasItems && compact && !checkoutVisible;
  useBottomBar(showBar, BAR_HEIGHT);

  const handleRemove = (item: CartItem, index: number) => {
    const name = displayName(item.name);
    remove(item._id);
    toast.info(`Removed ${name}`, {
      id: "cart",
      action: {
        label: "Undo",
        onClick: () => {
          const now = currentItems();
          if (now.some((entry) => entry._id === item._id)) return;
          const next = [...now];
          next.splice(Math.min(index, next.length), 0, item);
          writeItems(next);
        },
      },
    });
  };

  if (!ready) return <CartSkeleton />;

  if (!items.length) {
    return (
      <>
        <h1 className="type-h1 text-ink">Your cart</h1>
        {check.removed.length ? <RemovedNotice removed={check.removed} className="mt-4" /> : null}
        {emptyState}
      </>
    );
  }

  const freeShipping = qualifiesForFreeShipping(subtotal);
  const gst = extractInclusiveTaxAmount(subtotal);

  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="type-h1 text-ink">Your cart</h1>
        <p className="text-[14px] text-muted tabular">{pluralize(count, "item")}</p>
      </div>

      <div className="mt-4 grid gap-5 lg:mt-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <section aria-label="Items in your cart" className="min-w-0">
          {check.removed.length ? <RemovedNotice removed={check.removed} className="mb-4" /> : null}
          <FreeShippingMeter subtotal={subtotal} className="mb-4" />
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
            {items.map((item, index) => (
              <CartLine
                key={item._id}
                item={item}
                notice={check.notices[item._id]}
                onQuantity={(quantity) => updateQty(item._id, quantity)}
                onRemove={() => handleRemove(item, index)}
              />
            ))}
          </ul>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-chip text-[15px] font-semibold text-ink hover:text-signal-ink"
          >
            <IconArrowLeft size={18} />
            Continue shopping
          </Link>
        </section>

        <aside aria-labelledby="cart-summary-title" className="lg:sticky lg:top-24">
          <div className="rounded-card border border-line bg-card p-4 lg:p-5">
            <h2 id="cart-summary-title" className="type-h3 text-ink">
              Order summary
            </h2>
            <OrderTotals
              itemsLabel={`Subtotal (${pluralize(count, "item")})`}
              itemsTotal={subtotal}
              shipping={freeShipping ? 0 : null}
              shippingPending="Calculated at checkout"
              total={subtotal}
              gst={gst}
              className="mt-3"
            />
            <div ref={checkoutRef} className="mt-4">
              <ButtonLink
                href="/checkout"
                size="lg"
                fullWidth
                iconRight={<IconArrowRight size={20} />}
              >
                Checkout
              </ButtonLink>
            </div>
            <ul className="mt-4 space-y-2 border-t border-line pt-4 text-[13px] leading-[18px] text-ink-2">
              <li className="flex gap-2">
                <IconLock size={16} className="mt-px shrink-0 text-muted" />
                <span>Secure payment by Razorpay: UPI, cards or netbanking</span>
              </li>
              {COD_ENABLED ? (
                <li className="flex gap-2">
                  <IconCash size={16} className="mt-px shrink-0 text-muted" />
                  <span>
                    {isCodAllowed(subtotal)
                      ? `Cash on Delivery available on orders up to ${formatINR(COD_MAX_ORDER_VALUE)}`
                      : `Cash on Delivery is for orders up to ${formatINR(COD_MAX_ORDER_VALUE)}; pay online for this order`}
                  </span>
                </li>
              ) : null}
              <li className="flex gap-2">
                <IconReceipt size={16} className="mt-px shrink-0 text-muted" />
                <span>GST invoice with every order</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {hasItems && compact ? (
        <div
          aria-hidden={!showBar}
          className={
            "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] shadow-raised " +
            "transition-[transform,visibility] duration-200 ease-out motion-reduce:transition-none " +
            (showBar ? "visible translate-y-0" : "invisible translate-y-full")
          }
        >
          <div className="page-wrap flex h-[76px] items-center gap-3">
            <div className="min-w-0">
              <p className="type-price text-[19px] leading-6 text-ink">{formatINR(subtotal)}</p>
              <p className="text-[12px] leading-4 text-muted">
                {freeShipping ? "Incl. GST · free shipping" : "Incl. GST · plus shipping"}
              </p>
            </div>
            <ButtonLink
              href="/checkout"
              size="lg"
              className="flex-1"
              tabIndex={showBar ? undefined : -1}
              iconRight={<IconArrowRight size={20} />}
            >
              Checkout
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CartLine({
  item,
  notice,
  onQuantity,
  onRemove,
}: {
  item: CartItem;
  notice?: LineNotice;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const name = displayName(item.name);
  const step = packStep(item);
  const max = maxQuantity(item);
  const href = `/product/${item._id}`;
  const low = item.stock !== undefined && item.stock !== null && stockLevel(Number(item.stock), step).level === "low";

  return (
    <li className="flex gap-3 p-3 sm:gap-4 sm:p-4">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-card border border-line bg-card"
      >
        <ProductImage src={item.image} alt={name} fill sizes="64px" className="object-contain p-1.5" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1 pt-0.5">
            <Link
              href={href}
              className="line-clamp-2 text-[15px] font-semibold leading-5 text-ink hover:text-signal-ink"
            >
              {name}
            </Link>
            <p className="mt-0.5 text-[13px] leading-[18px] text-muted tabular">
              {formatINR(Number(item.price))} each
              {step > 1 ? ` · sold in packs of ${step}` : ""}
            </p>
          </div>
          <IconButton label={`Remove ${name}`} onClick={onRemove} className="-mr-2 -mt-1.5 text-muted hover:text-danger">
            <IconTrash size={20} />
          </IconButton>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <QuantityStepper
            value={item.quantity}
            onChange={onQuantity}
            step={step}
            max={Number.isFinite(max) ? max : undefined}
            label={`Quantity for ${name}`}
          />
          <p className="type-price text-[16px] leading-6 text-ink">{formatINR(Number(item.price) * item.quantity)}</p>
        </div>

        {low ? <StockStatus stock={Number(item.stock)} packSize={step} compact className="mt-2" /> : null}
        {notice?.price || notice?.quantity ? (
          <div className="mt-2 space-y-1 text-[13px] leading-[18px] text-warn">
            {notice.price ? (
              <p className="flex items-start gap-1.5">
                <IconInfo size={16} className="mt-px shrink-0" />
                <span>{notice.price}</span>
              </p>
            ) : null}
            {notice.quantity ? (
              <p className="flex items-start gap-1.5">
                <IconInfo size={16} className="mt-px shrink-0" />
                <span>{notice.quantity}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function RemovedNotice({ removed, className }: { removed: RemovedLine[]; className?: string }) {
  return (
    <div role="status" className={`rounded-card border border-warn/30 bg-warn-soft px-4 py-3 text-[14px] leading-5 text-ink ${className || ""}`}>
      <p className="flex items-start gap-2 font-semibold">
        <IconInfo size={18} className="mt-px shrink-0 text-warn" />
        {removed.length === 1 ? "We removed an item from your cart" : `We removed ${removed.length} items from your cart`}
      </p>
      <ul className="mt-1 space-y-0.5 pl-[26px] text-ink-2">
        {removed.map((line) => (
          <li key={line.id}>
            {line.name}: {line.reason === "out_of_stock" ? "out of stock" : "no longer available"}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your cart">
      <h1 className="type-h1 text-ink">Your cart</h1>
      <div className="mt-4 grid gap-5 lg:mt-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <div>
          <div className="mb-4 h-[86px] rounded-card border border-line bg-card" />
          <div className="divide-y divide-line rounded-card border border-line bg-card">
            {[0, 1].map((row) => (
              <div key={row} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                <div className="h-16 w-16 shrink-0 rounded-card border border-line bg-paper" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/3" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-11 w-[136px] rounded-card border border-line" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-[300px] rounded-card border border-line bg-card" />
      </div>
    </div>
  );
}
