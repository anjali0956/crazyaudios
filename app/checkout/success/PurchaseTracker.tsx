"use client";

import { useEffect } from "react";
import {
  LAST_PURCHASE_STORAGE_KEY,
  type StoredPurchase,
  trackPixelEvent,
} from "@/lib/meta-pixel";

// Fires the browser Purchase event once per order. The checkout page leaves the
// order details in sessionStorage; the key is removed so a refresh can't
// count the sale again. The server sends the same event_id, so Meta dedupes.
// `value` is the order's items subtotal read on the server, the same number the
// Conversions API sends; the stored value is only a fallback.
export default function PurchaseTracker({ orderId, value }: { orderId?: string; value?: number }) {
  useEffect(() => {
    if (!orderId) return;

    let purchase: StoredPurchase | null = null;
    try {
      purchase = JSON.parse(sessionStorage.getItem(LAST_PURCHASE_STORAGE_KEY) || "null");
    } catch {
      return;
    }
    if (!purchase || purchase.orderId !== orderId) return;

    sessionStorage.removeItem(LAST_PURCHASE_STORAGE_KEY);
    trackPixelEvent(
      "Purchase",
      {
        content_ids: purchase.contents.map((item) => item.id),
        content_type: "product",
        contents: purchase.contents,
        num_items: purchase.numItems,
        value: typeof value === "number" && Number.isFinite(value) ? value : purchase.value,
        currency: purchase.currency,
      },
      { eventID: purchase.eventId }
    );
  }, [orderId, value]);

  return null;
}
