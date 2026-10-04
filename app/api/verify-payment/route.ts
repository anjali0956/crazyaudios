import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { markOrderPaid } from "@/lib/payments";
import { isValidCheckoutSignature } from "@/lib/razorpay";

// Called by the checkout page after Razorpay Checkout reports success. A bad
// signature changes nothing: anyone can call this endpoint with any order id.
export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const internalOrderId = String(body?.internal_order_id || "").trim();
    const razorpayOrderId = String(body?.razorpay_order_id || "").trim();
    const razorpayPaymentId = String(body?.razorpay_payment_id || "").trim();
    const razorpaySignature = String(body?.razorpay_signature || "").trim();

    if (!internalOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error("[verify-payment] RAZORPAY_KEY_SECRET is not set; cannot verify payments.");
      return NextResponse.json(
        { error: "We couldn't confirm your payment right now. If money was deducted, your order will be confirmed automatically." },
        { status: 503 }
      );
    }

    if (!isValidCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret)) {
      console.warn(`[verify-payment] Signature mismatch for order ${internalOrderId}; nothing changed.`);
      return NextResponse.json(
        { success: false, error: "Payment could not be verified" },
        { status: 400 }
      );
    }

    if (!mongoose.isValidObjectId(internalOrderId)) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await dbConnect();
    const order = await Order.findById(internalOrderId)
      .select("razorpayOrderId")
      .lean<{ razorpayOrderId?: string }>();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.razorpayOrderId !== razorpayOrderId) {
      console.warn(`[verify-payment] Order ${internalOrderId} does not belong to ${razorpayOrderId}; nothing changed.`);
      return NextResponse.json(
        { success: false, error: "Payment could not be verified" },
        { status: 400 }
      );
    }

    const result = await markOrderPaid({
      orderId: internalOrderId,
      razorpayOrderId,
      razorpayPaymentId,
      signature: razorpaySignature,
      source: "verify-payment",
      request: req,
    });

    if (result.outcome === "paid" || result.outcome === "already_paid") {
      return NextResponse.json({
        success: true,
        orderId: result.order.id,
        receipt: result.order.receipt,
        invoiceNumber: result.order.invoiceNumber,
        status: result.order.status,
      });
    }

    if (result.outcome === "not_payable") {
      console.warn(
        `[verify-payment] Order ${internalOrderId} is "${result.order.status}", not payable; payment ${razorpayPaymentId} needs a manual check.`
      );
      return NextResponse.json(
        { success: false, error: "This order can no longer be paid. If money was deducted, please contact us." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (error) {
    console.error("[verify-payment] Failed:", error);
    return NextResponse.json(
      { error: "We couldn't confirm your payment right now. If money was deducted, your order will be confirmed automatically." },
      { status: 500 }
    );
  }
}
