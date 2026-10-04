import { IconReceipt, IconTruck } from "@/app/components/icons";
import { ButtonAnchor, ButtonLink } from "@/app/components/ui/Button";
import { cx } from "@/app/components/ui/cx";
import { displayName } from "@/lib/display";
import {
  OrderStatusChip,
  formatOrderAmount,
  formatOrderDate,
  normalizeStatus,
  paymentLabel,
  totalCaption,
  trackOrderHref,
} from "./order-display";
import { OrderItemThumb } from "./OrderItemThumb";

export type OrderCardData = {
  id: string;
  receipt: string;
  invoiceNumber: string;
  paymentMethod?: string;
  createdAt?: Date | string;
  fulfillmentStatus?: string;
  estimatedDelivery?: Date | string | null;
  totalAmount: number;
  customerEmail: string;
  items: Array<{ productId?: unknown; name: string; quantity: number; lineTotal?: number; image?: string }>;
};

/**
 * One order as a card: receipt + status chip, items, total and the two
 * actions (track, signed invoice link). `compact` swaps the item rows for a
 * thumbnail strip (My account).
 */
export function OrderCard({
  order,
  invoiceHref,
  headingLevel = "h2",
  compact = false,
  className,
}: {
  order: OrderCardData;
  /** Signed invoice URL (lib/order-access orderInvoicePath), built on the server. */
  invoiceHref: string;
  headingLevel?: "h2" | "h3";
  compact?: boolean;
  className?: string;
}) {
  const Heading = headingLevel;
  const status = normalizeStatus(order.fulfillmentStatus);
  const showEta = Boolean(order.estimatedDelivery) && !["delivered", "completed", "cancelled"].includes(status);
  const itemCount = order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const headingId = `order-${order.id}`;

  return (
    <article aria-labelledby={headingId} className={cx("rounded-card border border-line bg-card", className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 pb-3 pt-4 sm:px-5">
        <div className="min-w-0">
          <Heading id={headingId} className="type-mono text-[15px] font-semibold leading-[22px] text-ink">
            <span className="sr-only">Order </span>
            {order.receipt}
          </Heading>
          <p className="mt-0.5 text-[13px] leading-[18px] text-muted">
            {[order.createdAt ? `Ordered ${formatOrderDate(order.createdAt)}` : "", paymentLabel(order.paymentMethod)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <OrderStatusChip status={status} />
      </header>

      {compact ? (
        <div className="flex items-center gap-2 border-t border-line px-4 py-3 sm:px-5">
          <ul className="flex -space-x-2" aria-label="Items">
            {order.items.slice(0, 4).map((item, index) => (
              <li key={`${String(item.productId ?? item.name)}-${index}`}>
                <OrderItemThumb image={item.image} name={displayName(item.name)} className="h-10 w-10 ring-2 ring-card" />
              </li>
            ))}
          </ul>
          <p className="min-w-0 truncate text-[14px] leading-5 text-ink-2">
            {order.items.length === 1
              ? displayName(order.items[0].name)
              : `${itemCount} items`}
          </p>
        </div>
      ) : (
        <ul className="border-t border-line px-4 sm:px-5">
          {order.items.map((item, index) => (
            <li
              key={`${String(item.productId ?? item.name)}-${index}`}
              className={cx("flex items-center gap-3 py-3", index > 0 && "border-t border-line")}
            >
              <OrderItemThumb image={item.image} name={displayName(item.name)} />
              <span className="min-w-0 flex-1 text-[15px] leading-[21px] text-ink">
                {displayName(item.name)}
                <span className="block text-[13px] leading-[18px] text-muted">Qty {item.quantity}</span>
              </span>
              {typeof item.lineTotal === "number" ? (
                <span className="type-price shrink-0 text-[15px] text-ink">{formatOrderAmount(item.lineTotal)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-line px-4 py-3 sm:px-5">
        {showEta ? (
          <p className="text-[14px] leading-5 text-ink-2">
            Estimated delivery <span className="font-semibold text-ink">{formatOrderDate(order.estimatedDelivery)}</span>
          </p>
        ) : null}
        <div className={cx("flex items-baseline justify-between gap-4", showEta && "mt-1.5")}>
          <p className="text-[15px] font-semibold leading-[22px] text-ink">{totalCaption(order.paymentMethod)}</p>
          <p className="type-price text-[18px] leading-6 text-ink">{formatOrderAmount(order.totalAmount)}</p>
        </div>
        {order.invoiceNumber ? (
          <p className="mt-0.5 text-[13px] leading-[18px] text-muted">
            Invoice <span className="type-mono">{order.invoiceNumber}</span>
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-line p-3 sm:flex sm:px-5">
        <ButtonLink href={trackOrderHref(order)} variant="outline" size="md" icon={<IconTruck size={18} />} className="px-3">
          Track
          <span className="sr-only"> order {order.receipt}</span>
        </ButtonLink>
        <ButtonAnchor href={invoiceHref} variant="outline" size="md" icon={<IconReceipt size={18} />} className="px-3">
          Invoice
          <span className="sr-only"> for order {order.receipt}</span>
        </ButtonAnchor>
      </div>
    </article>
  );
}
