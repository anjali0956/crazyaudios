"use client";

import { deliveryPromise } from "@/app/components/checkout/format";
import { IconAlert, IconTruck } from "@/app/components/icons";
import { Button } from "@/app/components/ui/Button";
import { cx } from "@/app/components/ui/cx";
import { formatINR } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping-policy";
import type { QuoteState } from "./useShippingQuotes";

const BOX = "flex items-start gap-3 rounded-card border px-3.5 py-3";

/**
 * The auto-selected courier for this PIN code: "Delivered by Thu, 8 Oct ·
 * Blue Dart Air" and the shipping charge (FREE when free shipping applies).
 */
export function DeliveryEstimate({
  state,
  pincode,
  onRetry,
}: {
  state: QuoteState;
  /** The valid PIN code being quoted, or null. */
  pincode: string | null;
  onRetry: () => void;
}) {
  if (!pincode || state.status === "idle") {
    return (
      <div className={cx(BOX, "border-line bg-card")}>
        <IconTruck size={22} className="mt-px shrink-0 text-muted" />
        <p className="text-[14px] leading-5 text-muted">Enter your PIN code to see the delivery date and shipping charge.</p>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className={cx(BOX, "border-line bg-card")} aria-busy="true">
        <IconTruck size={22} className="mt-px shrink-0 text-muted" />
        <p className="text-[14px] leading-5 text-ink-2">
          Checking couriers for <span className="font-mono tabular">{pincode}</span>…
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    if (state.kind === "network") {
      return (
        <div className={cx(BOX, "border-warn/30 bg-warn-soft")}>
          <IconAlert size={20} className="mt-px shrink-0 text-warn" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] leading-5 text-ink">{state.message}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className={cx(BOX, "border-danger/25 bg-danger-soft")}>
        <IconAlert size={20} className="mt-px shrink-0 text-danger" />
        <p className="text-[14px] leading-5 text-ink">We can&apos;t deliver to this PIN code yet. Check the PIN code above.</p>
      </div>
    );
  }

  const { quote } = state;
  const free = quote.shippingFee <= 0;
  return (
    <div className={cx(BOX, "border-line bg-card")}>
      <IconTruck size={22} className="mt-px shrink-0 text-ink-2" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-5 text-ink">{deliveryPromise(quote)}</p>
        <p className="mt-0.5 text-[13px] leading-[18px] text-muted">
          {quote.courierName}
          {free && quote.freeShippingApplied && FREE_SHIPPING_THRESHOLD > 0
            ? ` · Free shipping on orders from ${formatINR(FREE_SHIPPING_THRESHOLD)}`
            : ""}
        </p>
      </div>
      <p className="shrink-0 text-[15px] font-semibold leading-5 tabular">
        {free ? <span className="text-ok">FREE</span> : <span className="text-ink">{formatINR(quote.shippingFee)}</span>}
      </p>
    </div>
  );
}
