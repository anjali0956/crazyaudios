import crypto from "crypto";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { sendOrderConfirmationEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const internalOrderId = String(body?.internal_order_id || "").trim();
    const razorpayOrderId = String(body?.razorpay_order_id || "").trim();
    const razorpayPaymentId = String(body?.razorpay_payment_id || "").trim();
    const razorpaySignature = String(body?.razorpay_signature || "").trim();

    if (!internalOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay secret is not configured" }, { status: 500 });
    }

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      await Order.findByIdAndUpdate(internalOrderId, {
        status: "failed",
        razorpayPaymentId,
        razorpaySignature,
      });
      return NextResponse.json({ success: false, error: "Invalid payment signature" }, { status: 400 });
    }

    const order = await Order.findById(internalOrderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
    }

    const isFirstSuccessfulPayment = order.status !== "paid";

    if (isFirstSuccessfulPayment) {
      for (const item of order.items) {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );

        if (!updatedProduct) {
          return NextResponse.json({ error: `Insufficient stock for ${item.name}` }, { status: 400 });
        }
      }
    }

    order.status = "paid";
    order.fulfillmentStatus = order.fulfillmentStatus || "processing";
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    if (!order.trackingTimeline?.length) {
      order.trackingTimeline.push({
        status: "processing",
        title: "Order Confirmed",
        description: "Payment verified successfully. We are preparing your shipment.",
        location: "CrazyAudios Warehouse",
        createdAt: new Date(),
      } as any);
    }
    await order.save();

    let emailSent = false;
    let emailError = "";

    if (isFirstSuccessfulPayment) {
      try {
        const pdfBytes = await generateInvoicePdf(order.toObject());
        await sendOrderConfirmationEmail({
          to: order.customerEmail,
          customerName: order.customerName,
          receipt: order.receipt,
          invoiceNumber: order.invoiceNumber,
          totalAmount: order.totalAmount,
          invoicePdf: pdfBytes,
        });
        emailSent = true;
      } catch (error: any) {
        emailError = error?.message || "Failed to send confirmation email";
        console.error("Order confirmation email failed:", error);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: String(order._id),
      receipt: order.receipt,
      invoiceNumber: order.invoiceNumber,
      emailSent,
      ...(emailError ? { emailError } : {}),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
