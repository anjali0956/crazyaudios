export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "3060638780773435";

export type PixelContent = { id: string; quantity: number; item_price?: number };

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// The pixel script loads "afterInteractive", so an event fired during the
// first render can arrive before window.fbq exists. Retry briefly instead of
// silently dropping it.
export function trackPixelEvent(
  eventName: string,
  params: Record<string, unknown> = {},
  options: { eventID?: string } = {}
) {
  if (typeof window === "undefined") return;

  let attempts = 0;
  const send = () => {
    if (typeof window.fbq === "function") {
      if (options.eventID) {
        window.fbq("track", eventName, params, { eventID: options.eventID });
      } else {
        window.fbq("track", eventName, params);
      }
      return;
    }

    attempts += 1;
    if (attempts <= 16) {
      window.setTimeout(send, 250);
    }
  };

  send();
}

export function getPurchaseEventId(orderId: string) {
  return `purchase_${orderId}`;
}

// Hand-off between the checkout page and the success page, so the browser
// Purchase event fires after navigation instead of racing it.
export const LAST_PURCHASE_STORAGE_KEY = "ca_last_purchase";

export type StoredPurchase = {
  orderId: string;
  eventId: string;
  value: number;
  currency: "INR";
  contents: PixelContent[];
  numItems: number;
  paymentMethod: "prepaid" | "cod";
};
