import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { CONFIRMED_ORDER_STATUSES } from "@/lib/order-utils";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const receipt = String(body?.receipt || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!receipt || !email) {
      return NextResponse.json(
        { error: "Order receipt and email are required" },
        { status: 400 }
      );
    }

    const order = await Order.findOne({
      receipt,
      customerEmail: email,
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
      totalAmount: order.totalAmount,
      items: order.items || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to track order" },
      { status: 500 }
    );
  }
}
