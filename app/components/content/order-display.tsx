import { cx } from "@/app/components/ui/cx";

// Presentation helpers shared by My account, My orders and Track your order.

export type FulfillmentStatus =
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled";

type Tone = "neutral" | "transit" | "done" | "stopped";

const STATUS: Record<FulfillmentStatus, { label: string; tone: Tone }> = {
  processing: { label: "Processing", tone: "neutral" },
  packed: { label: "Packed", tone: "neutral" },
  shipped: { label: "Shipped", tone: "transit" },
  out_for_delivery: { label: "Out for delivery", tone: "transit" },
  delivered: { label: "Delivered", tone: "done" },
  completed: { label: "Completed", tone: "done" },
  cancelled: { label: "Cancelled", tone: "stopped" },
};

const TONES: Record<Tone, { chip: string; dot: string }> = {
  neutral: { chip: "border border-line-strong bg-card text-ink-2", dot: "bg-muted" },
  transit: { chip: "bg-signal-soft text-signal-ink", dot: "bg-signal-ink" },
  done: { chip: "bg-ok-soft text-ok", dot: "bg-ok" },
  stopped: { chip: "bg-danger-soft text-danger", dot: "bg-danger" },
};

export function normalizeStatus(status: unknown): FulfillmentStatus {
  const value = String(status || "processing") as FulfillmentStatus;
  return value in STATUS ? value : "processing";
}

export function statusLabel(status: unknown) {
  return STATUS[normalizeStatus(status)].label;
}

/** Mono uppercase status pill with a dot, e.g. "● Shipped". */
export function OrderStatusChip({ status, className }: { status: unknown; className?: string }) {
  const info = STATUS[normalizeStatus(status)];
  const tone = TONES[info.tone];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] font-mono text-[11px] font-semibold uppercase leading-4 tracking-[0.08em]",
        tone.chip,
        className
      )}
    >
      <span aria-hidden="true" className={cx("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {info.label}
    </span>
  );
}

const INR_EXACT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const INR_WHOLE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Exact amount for order records: "₹1,005" or "₹1,001.70". Unlike catalogue
 * prices (lib/format formatINR, whole rupees), an order total must match what
 * was charged to the paisa.
 */
export function formatOrderAmount(value: unknown) {
  const amount = Math.round((Number(value) || 0) * 100) / 100;
  return Number.isInteger(amount) ? INR_WHOLE.format(amount) : INR_EXACT.format(amount);
}

/** "5 Oct 2026" in India time. */
export function formatOrderDate(value: unknown) {
  if (!value) return "";
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

/** "5 Oct 2026, 3:42 pm" in India time. */
export function formatOrderDateTime(value: unknown) {
  if (!value) return "";
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function paymentLabel(paymentMethod: unknown) {
  return paymentMethod === "cod" ? "Cash on Delivery" : "Paid online";
}

/** "Pay on delivery" / "Total paid" caption for the order total. */
export function totalCaption(paymentMethod: unknown) {
  return paymentMethod === "cod" ? "Pay on delivery" : "Total paid";
}

/** /track-your-order link with the order's receipt and checkout email filled in. */
export function trackOrderHref(order: { receipt: string; customerEmail?: string }) {
  const params = new URLSearchParams({ receipt: order.receipt, email: order.customerEmail || "" });
  return `/track-your-order?${params.toString()}`;
}
