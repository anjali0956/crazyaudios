// Small formatting helpers for the cart, checkout and order pages. Client-safe.

const SHORT_DATE: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };

/** "2026-10-08" -> "Thu, 8 Oct" (calendar date, no timezone shift). "" when unusable. */
export function formatEtaDate(isoDate?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ""));
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", SHORT_DATE);
}

/** A stored Date (server) -> "Thu, 8 Oct" in India time. "" when unusable. */
export function formatIndiaDate(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { ...SHORT_DATE, timeZone: "Asia/Kolkata" });
}

/** The delivery promise for a courier quote: "Delivered by Thu, 8 Oct" or "Delivery in 3–6 days". */
export function deliveryPromise(quote: { etaDate?: string | null; estimatedDeliveryText?: string | null }) {
  const eta = formatEtaDate(quote.etaDate);
  if (eta) return `Delivered by ${eta}`;
  const text = String(quote.estimatedDeliveryText || "").trim();
  if (/^\d+\s*[–-]\s*\d+\s*days?$/i.test(text)) return `Delivery in ${text.replace(/\s*[–-]\s*/, "–")}`;
  if (/day/i.test(text)) return `Delivery: ${text}`;
  return "Delivery in 3–6 days";
}
