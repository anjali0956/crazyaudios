import type { ReactNode } from "react";
import { cx } from "@/app/components/ui/cx";
import { formatINR } from "@/lib/format";

export type OrderTotalsProps = {
  /** Units in the order, shown as "Items (3)". Omit to show plain "Items". */
  itemCount?: number;
  /** Replaces the "Items (3)" label, e.g. "Subtotal". */
  itemsLabel?: ReactNode;
  /** Items subtotal, GST incl. */
  itemsTotal: number;
  /** Shipping charged; 0 renders FREE; null = not known yet (shows `shippingPending`). */
  shipping: number | null;
  /** Row label, e.g. "Shipping · Blue Dart Air". */
  shippingLabel?: ReactNode;
  shippingPending?: ReactNode;
  /** Cash on Delivery fee; the row is shown only when this is a number. */
  codFee?: number | null;
  total: number;
  totalLabel?: ReactNode;
  /** GST included in the total; shown once as "Includes ₹X GST". */
  gst?: number | null;
  /** Extra line under the total (e.g. "Pay in cash when your parcel arrives"). */
  totalNote?: ReactNode;
  className?: string;
};

function Row({ label, value, className }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-4 py-1", className)}>
      <dt className="min-w-0 text-ink-2">{label}</dt>
      <dd className="shrink-0 text-right tabular text-ink">{value}</dd>
    </div>
  );
}

/**
 * Honest order totals: Items, Shipping (FREE / ₹X), COD fee when it applies,
 * Total, and the GST it includes. Used by the checkout summary and the order
 * confirmation page. No hooks.
 */
export function OrderTotals({
  itemCount,
  itemsLabel,
  itemsTotal,
  shipping,
  shippingLabel = "Shipping",
  shippingPending = "Enter PIN code",
  codFee,
  total,
  totalLabel = "Total",
  gst,
  totalNote,
  className,
}: OrderTotalsProps) {
  return (
    <div className={cx("text-[14px] leading-5", className)}>
      <dl>
        <Row label={itemsLabel ?? (itemCount ? `Items (${itemCount})` : "Items")} value={formatINR(itemsTotal)} />
        <Row
          label={shippingLabel}
          value={
            shipping === null ? (
              <span className="text-muted">{shippingPending}</span>
            ) : shipping <= 0 ? (
              <span className="font-semibold text-ok">FREE</span>
            ) : (
              formatINR(shipping)
            )
          }
        />
        {typeof codFee === "number" ? <Row label="Cash on Delivery fee" value={formatINR(codFee)} /> : null}
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="text-[16px] font-bold leading-6 text-ink">{totalLabel}</dt>
          <dd className="type-price shrink-0 text-[19px] leading-6 text-ink">{formatINR(total)}</dd>
        </div>
      </dl>
      {typeof gst === "number" && gst > 0 ? (
        <p className="mt-1 text-[12.5px] leading-[18px] text-muted">Includes {formatINR(gst)} GST</p>
      ) : null}
      {totalNote ? <p className="mt-1 text-[12.5px] leading-[18px] text-ink-2">{totalNote}</p> : null}
    </div>
  );
}
