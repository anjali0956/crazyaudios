// Store-wide shipping and payment rules. NEXT_PUBLIC_ so the checkout page
// and the server agree; the server re-applies them on every order.

function readNumber(value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

// Product subtotal (incl. GST) at or above which standard shipping is free.
// Set to 0 to switch free shipping off.
export const FREE_SHIPPING_THRESHOLD = readNumber(
  process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD,
  1499
);

export const COD_ENABLED = process.env.NEXT_PUBLIC_COD_ENABLED !== "false";

// Highest product subtotal allowed for Cash on Delivery.
export const COD_MAX_ORDER_VALUE = readNumber(process.env.NEXT_PUBLIC_COD_MAX_ORDER_VALUE, 5000);

export type PaymentMethod = "prepaid" | "cod";

export function qualifiesForFreeShipping(subtotal: number) {
  return FREE_SHIPPING_THRESHOLD > 0 && Number(subtotal) >= FREE_SHIPPING_THRESHOLD;
}

export function amountLeftForFreeShipping(subtotal: number) {
  if (FREE_SHIPPING_THRESHOLD <= 0) return 0;
  return Math.max(0, Math.ceil(FREE_SHIPPING_THRESHOLD - Number(subtotal || 0)));
}

export function isCodAllowed(subtotal: number) {
  return COD_ENABLED && Number(subtotal) > 0 && Number(subtotal) <= COD_MAX_ORDER_VALUE;
}

export function normalizePaymentMethod(value: unknown): PaymentMethod {
  return value === "cod" ? "cod" : "prepaid";
}

export function formatRupees(value: number) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}
