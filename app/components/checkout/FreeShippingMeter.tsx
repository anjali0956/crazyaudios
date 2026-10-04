import { IconCheckCircle, IconTruck } from "@/app/components/icons";
import { cx } from "@/app/components/ui/cx";
import { formatINR } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, amountLeftForFreeShipping } from "@/lib/shipping-policy";

/**
 * "Add ₹549 more for free shipping" with a progress bar; turns green once the
 * items subtotal reaches NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD. Renders nothing
 * when free shipping is switched off. No hooks: works in server and client components.
 */
export function FreeShippingMeter({ subtotal, className }: { subtotal: number; className?: string }) {
  if (FREE_SHIPPING_THRESHOLD <= 0) return null;
  const left = amountLeftForFreeShipping(subtotal);
  const done = left <= 0;
  const percent = done ? 100 : Math.max(4, Math.min(96, (Number(subtotal) / FREE_SHIPPING_THRESHOLD) * 100));

  return (
    <div className={cx("rounded-card border border-line bg-card px-4 py-3", className)}>
      <p className="flex items-start gap-2 text-[14px] leading-5 text-ink">
        {done ? (
          <IconCheckCircle size={18} className="mt-px shrink-0 text-ok" />
        ) : (
          <IconTruck size={18} className="mt-px shrink-0 text-ink-2" />
        )}
        {done ? (
          <span>
            <strong className="font-semibold text-ok">Free shipping</strong> on this order
          </span>
        ) : (
          <span>
            Add <strong className="type-price">{formatINR(left)}</strong> more for free shipping
          </span>
        )}
      </p>
      <div aria-hidden="true" className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className={cx("h-full rounded-full transition-[width] duration-200 ease-out", done ? "bg-ok" : "bg-signal")}
          style={{ width: `${percent}%` }}
        />
      </div>
      {!done ? (
        <p className="mt-1.5 text-[12px] leading-4 text-muted">
          Free shipping on orders from {formatINR(FREE_SHIPPING_THRESHOLD)}
        </p>
      ) : null}
    </div>
  );
}
