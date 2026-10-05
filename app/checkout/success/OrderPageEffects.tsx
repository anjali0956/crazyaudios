"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCartActions } from "@/app/components/cart/CartProvider";
import { PENDING_ORDER_KEY } from "../razorpay-client";

/**
 * Side effects of the order confirmation page:
 * - clears the cart after a Razorpay redirect (in-app browsers), but only for
 *   the order this tab was paying for, so opening an old order link never
 *   empties a cart;
 * - while a prepaid order is still being confirmed, re-reads it from the
 *   server every few seconds (for about a minute).
 */
export function OrderPageEffects({
  orderId,
  clearCart,
  autoRefresh,
}: {
  orderId: string;
  clearCart: boolean;
  autoRefresh: boolean;
}) {
  const { clear } = useCartActions();
  const router = useRouter();

  useEffect(() => {
    if (!clearCart) return;
    try {
      if (window.sessionStorage.getItem(PENDING_ORDER_KEY) !== orderId) return;
      window.sessionStorage.removeItem(PENDING_ORDER_KEY);
    } catch {
      return;
    }
    clear();
  }, [orderId, clearCart, clear]);

  useEffect(() => {
    if (!autoRefresh) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (tries > 10) {
        window.clearInterval(timer);
        return;
      }
      router.refresh();
    }, 6000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, router]);

  return null;
}
