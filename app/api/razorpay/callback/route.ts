import { after } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { markOrderPaid } from "@/lib/payments";
import { isValidCheckoutSignature } from "@/lib/razorpay";

// Razorpay Checkout "redirect mode" lands here. Inside the Instagram and
// Facebook in-app browsers the checkout page opens Razorpay with
// redirect: true, because switching to a UPI app and back often kills the
// in-page modal before its handler runs. Razorpay then POSTs the result to
// this URL as a form:
//   success: razorpay_payment_id, razorpay_order_id, razorpay_signature
//   failure: error[code], error[description], error[source], error[step],
//            error[reason], error[metadata] (JSON with payment_id, order_id)
// The signature is verified exactly like /api/verify-payment, the order is
// marked paid with the same routine (lib/payments), and the browser is sent
// on with a 303 so it follows with a GET.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FailureReason = "failed" | "cancelled" | "verify";

// Relative Location: the browser stays on whichever host it used (www or not),
// so the sessionStorage hand-off to the success page survives.
function seeOther(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "no-store" },
  });
}

function backToCheckout(reason: FailureReason) {
  return seeOther(`/checkout?payment=failed&reason=${reason}`);
}

function successPath(orderId: string, receipt: string) {
  return `/checkout/success?order=${encodeURIComponent(orderId)}&receipt=${encodeURIComponent(receipt)}`;
}

async function readFields(req: Request): Promise<Record<string, string>> {
  const fields: Record<string, string> = {};
  const type = req.headers.get("content-type") || "";
  try {
    if (type.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown> | null;
      for (const [key, value] of Object.entries(body || {})) {
        if (typeof value === "string" || typeof value === "number") fields[key] = String(value);
      }
    } else {
      const form = await req.formData();
      form.forEach((value, key) => {
        if (typeof value === "string") fields[key] = value;
      });
    }
  } catch {
    // An unreadable body is treated as a failed payment below.
  }
  return fields;
}

export async function POST(req: Request) {
  const fields = await readFields(req);
  const razorpayPaymentId = String(fields.razorpay_payment_id || "").trim();
  const razorpayOrderId = String(fields.razorpay_order_id || "").trim();
  const signature = String(fields.razorpay_signature || "").trim();
  const errorReason = String(fields["error[reason]"] || "");
  const hasError = Object.keys(fields).some((key) => key.startsWith("error["));

  if (hasError || !razorpayPaymentId || !razorpayOrderId || !signature) {
    console.info(
      `[razorpay-callback] Payment not completed (${fields["error[code]"] || "no code"}: ${
        errorReason || fields["error[description]"] || "missing fields"
      }) ${fields["error[metadata]"] || ""}`.trim()
    );
    return backToCheckout(/cancel/i.test(errorReason) ? "cancelled" : "failed");
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    console.error("[razorpay-callback] RAZORPAY_KEY_SECRET is not set; cannot verify payments.");
    return backToCheckout("verify");
  }

  if (!isValidCheckoutSignature(razorpayOrderId, razorpayPaymentId, signature, keySecret)) {
    console.warn(`[razorpay-callback] Signature mismatch for ${razorpayOrderId}; nothing changed.`);
    return backToCheckout("verify");
  }

  let order: { _id: unknown; receipt?: string } | null = null;
  try {
    await dbConnect();
    order = await Order.findOne({ razorpayOrderId })
      .select("_id receipt")
      .lean<{ _id: unknown; receipt?: string }>();

    if (!order) {
      console.warn(`[razorpay-callback] No order for ${razorpayOrderId} (payment ${razorpayPaymentId}).`);
      return backToCheckout("verify");
    }

    const result = await markOrderPaid({
      orderId: String(order._id),
      razorpayOrderId,
      razorpayPaymentId,
      signature,
      // Same check as /api/verify-payment (checkout signature), delivered by redirect.
      source: "verify-payment",
      // The customer's own browser made this request: its IP and user agent help Meta matching.
      request: req,
      // Answer the browser first; report the sale to Meta after the response.
      defer: (task) => after(task),
    });

    if (result.outcome === "not_found") return backToCheckout("verify");
    if (result.outcome === "not_payable") {
      console.warn(
        `[razorpay-callback] Order ${result.order.id} is "${result.order.status}", not payable; payment ${razorpayPaymentId} needs a manual check.`
      );
    }
    // paid, already_paid and not_payable: the success page shows the order's real status.
    return seeOther(successPath(String(order._id), String(order.receipt || "")));
  } catch (error) {
    console.error(`[razorpay-callback] Failed for ${razorpayOrderId}:`, error);
    // The signature was valid, so the money is real: the webhook confirms the
    // order. Show the order page ("confirming") rather than inviting a second payment.
    if (order?.receipt) return seeOther(successPath(String(order._id), String(order.receipt)));
    return backToCheckout("verify");
  }
}

// A GET here means someone opened the URL directly: nothing to process.
export function GET() {
  return seeOther("/checkout");
}
