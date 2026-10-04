// Browser-side Razorpay Checkout helpers.

export type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayInstance = {
  on: (event: string, callback: (response: unknown) => void) => void;
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/** What POST /api/create-order returns for a prepaid order. */
export type PrepaidOrder = {
  internal_order_id: string;
  key_id: string;
  order_id: string;
  amount: number;
  currency?: string;
  receipt: string;
  totals?: { subtotal?: number; totalAmount?: number };
};

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<boolean> | null = null;

/** Loads checkout.js once (safe to call early to warm it up). Resolves false when it can't load. */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      // Let the next attempt try again (flaky mobile networks).
      scriptPromise = null;
      script.remove();
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Instagram and Facebook in-app browsers: Razorpay's in-page modal often dies
 * when the customer switches to a UPI app and back, so those get redirect mode.
 */
export function isInAppBrowser(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent) {
  return /FBAN|FBAV|Instagram/i.test(userAgent);
}

/** sessionStorage: the order this tab is paying for, so the success page can clear the cart after a redirect. */
export const PENDING_ORDER_KEY = "ca_pending_order";
