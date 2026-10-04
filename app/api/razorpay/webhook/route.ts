import { after, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import { markOrderPaid } from "@/lib/payments";
import { isValidWebhookSignature } from "@/lib/razorpay";

// Razorpay -> server confirmation of payments. This is what saves an order
// when the customer's browser never comes back (UPI app switch, closed tab,
// dead network): Razorpay calls us directly once the money is captured.
// Dashboard setup: Settings -> Webhooks, events payment.captured + order.paid,
// secret = RAZORPAY_WEBHOOK_SECRET.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLED_EVENTS = new Set(["payment.captured", "order.paid"]);

type WebhookEntity = Record<string, unknown> | undefined;

function entityOf(payload: unknown, name: "payment" | "order"): WebhookEntity {
  const container = (payload as Record<string, { entity?: Record<string, unknown> }> | undefined)?.[name];
  return container?.entity;
}

function noteOf(entity: WebhookEntity, key: string) {
  const notes = entity?.notes;
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) return "";
  return String((notes as Record<string, unknown>)[key] || "");
}

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set, so webhooks can't be verified. " +
        "Add it in DigitalOcean (same value as in Razorpay Dashboard -> Settings -> Webhooks)."
    );
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  const eventId = req.headers.get("x-razorpay-event-id") || "";

  if (!signature || !isValidWebhookSignature(rawBody, signature, secret)) {
    console.warn(`[razorpay-webhook] Rejected a request with an invalid signature (event ${eventId || "?"}).`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: unknown };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventName = String(event?.event || "");
  if (!HANDLED_EVENTS.has(eventName)) {
    return NextResponse.json({ status: "ignored", event: eventName });
  }

  const payment = entityOf(event.payload, "payment");
  const order = entityOf(event.payload, "order");
  const razorpayOrderId = String(payment?.order_id || order?.id || "");
  const razorpayPaymentId = String(payment?.id || "");

  if (!razorpayOrderId || !razorpayPaymentId) {
    console.warn(`[razorpay-webhook] ${eventName} ${eventId} has no order/payment id; ignored.`);
    return NextResponse.json({ status: "ignored" });
  }
  if (payment?.status && payment.status !== "captured") {
    return NextResponse.json({ status: "ignored", reason: `payment ${String(payment.status)}` });
  }

  const internalOrderId = noteOf(order, "internal_order_id") || noteOf(payment, "internal_order_id");
  const receipt = String(order?.receipt || "") || noteOf(order, "receipt");
  const amountPaise = Number(payment?.amount ?? order?.amount_paid);

  try {
    await dbConnect();
    const result = await markOrderPaid({
      orderId: mongoose.isValidObjectId(internalOrderId) ? internalOrderId : undefined,
      razorpayOrderId,
      razorpayPaymentId,
      receipt: receipt || undefined,
      amountPaise: Number.isFinite(amountPaise) && amountPaise > 0 ? amountPaise : undefined,
      source: "webhook",
      // Reply to Razorpay first; report the sale to Meta afterwards.
      defer: (task) => after(task),
    });

    if (result.outcome === "not_found") {
      console.warn(
        `[razorpay-webhook] ${eventName} for ${razorpayOrderId} matches no order here (receipt ${receipt || "-"}); ignored.`
      );
      return NextResponse.json({ status: "ignored", reason: "unknown order" });
    }
    if (result.outcome === "not_payable") {
      console.warn(
        `[razorpay-webhook] Payment ${razorpayPaymentId} captured for order ${result.order.id}, ` +
          `which is "${result.order.status}". Check it by hand.`
      );
    }

    return NextResponse.json({ status: result.outcome });
  } catch (error) {
    // 5xx makes Razorpay retry later, which is what we want if the DB blipped.
    console.error(`[razorpay-webhook] Failed to process ${eventName} for ${razorpayOrderId}:`, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
