import crypto from "crypto";
import Razorpay from "razorpay";
import { safeEqual } from "@/lib/secure-compare";

export function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function getPublicRazorpayKey() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) throw new Error("RAZORPAY_KEY_ID is not configured");
  return keyId;
}

function hmacHex(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// Signature Razorpay Checkout hands the browser after a payment:
// HMAC-SHA256("<order_id>|<payment_id>", key secret).
export function isValidCheckoutSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  keySecret: string
) {
  return safeEqual(hmacHex(keySecret, `${razorpayOrderId}|${razorpayPaymentId}`), signature);
}

// X-Razorpay-Signature on webhooks: HMAC-SHA256(raw request body, webhook secret).
export function isValidWebhookSignature(rawBody: string, signature: string, webhookSecret: string) {
  return safeEqual(hmacHex(webhookSecret, rawBody), signature);
}

export type RazorpayPaymentSummary = {
  id: string;
  status: string;
  amount: number;
};

export async function fetchOrderPayments(
  client: Razorpay,
  razorpayOrderId: string
): Promise<RazorpayPaymentSummary[]> {
  const response = await client.orders.fetchPayments(razorpayOrderId);
  const items = Array.isArray(response?.items) ? response.items : [];
  return items.map((payment) => ({
    id: String(payment.id || ""),
    status: String(payment.status || ""),
    amount: Number(payment.amount || 0),
  }));
}
