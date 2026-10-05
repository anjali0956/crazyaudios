"use client";

import { useEffect } from "react";

// Razorpay redirect mode (Instagram / Facebook in-app browsers): the checkout
// page is gone by the time the payment completes, so it can't empty the cart
// itself as it does after the in-page modal. Before opening Razorpay it notes
// the order this tab is paying for (and the typed details, in case the payment
// fails and the customer comes back to the checkout).
export const PENDING_ORDER_KEY = "ca_pending_order";
export const SAVED_CHECKOUT_FORM_KEY = "ca_checkout_form";

// Empties the cart once that order is confirmed. Only the order this tab was
// paying for counts, so opening an old order link never clears a cart.
export default function ClearPaidCart({ orderId }: { orderId: string }) {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(PENDING_ORDER_KEY) !== orderId) return;
      window.sessionStorage.removeItem(PENDING_ORDER_KEY);
      window.sessionStorage.removeItem(SAVED_CHECKOUT_FORM_KEY);
      window.localStorage.removeItem("cart");
    } catch {
      // Storage blocked: nothing to clear.
    }
  }, [orderId]);

  return null;
}
