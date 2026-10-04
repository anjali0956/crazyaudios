import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { CONFIRMED_ORDER_STATUSES } from "@/lib/order-utils";
import { emailMatcher, normalizeEmail } from "@/lib/email";
import { orderInvoicePath } from "@/lib/order-access";
import { consumeRateLimits, getRequestIp } from "@/lib/rate-limit";

// Receipt + email lookups per IP. A match now also returns the invoice link,
// so guessing is throttled (in-memory, per server instance).
const LOOKUPS_PER_IP = 30;
const LOOKUP_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const receipt = String(body?.receipt || "").trim();
    const email = normalizeEmail(body?.email);

    if (!receipt || !email) {
      return NextResponse.json(
        { error: "Order receipt and email are required" },
        { status: 400 }
      );
    }

    const ip = getRequestIp(req.headers);
    const limit = consumeRateLimits(
      ip === "unknown" ? [] : [{ key: `track:${ip}`, limit: LOOKUPS_PER_IP, windowMs: LOOKUP_WINDOW_MS }]
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many lookups. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    await dbConnect();

    // Emails are stored lowercase now, but older orders can have capitals.
    const order = await Order.findOne({
      receipt,
      customerEmail: emailMatcher(email),
      status: { $in: CONFIRMED_ORDER_STATUSES },
    }).lean();

    if (!order) {
      return NextResponse.json(
        { error: "We could not find an order matching those details." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      receipt: order.receipt,
      invoiceNumber: order.invoiceNumber,
      invoiceUrl: orderInvoicePath(order),
      fulfillmentStatus: order.fulfillmentStatus || "processing",
      courierName: order.courierName || "",
      trackingNumber: order.trackingNumber || "",
      estimatedDelivery: order.estimatedDelivery || null,
      trackingTimeline: order.trackingTimeline || [],
      shippingAddress: {
        city: order.shippingAddress?.city || "",
        state: order.shippingAddress?.state || "",
        pincode: order.shippingAddress?.pincode || "",
      },
      paymentMethod: order.paymentMethod || "prepaid",
      totalAmount: order.totalAmount,
      items: order.items || [],
    });
  } catch (error) {
    console.error("[track-order] Failed:", error);
    return NextResponse.json(
      { error: "We could not fetch tracking details right now." },
      { status: 500 }
    );
  }
}
