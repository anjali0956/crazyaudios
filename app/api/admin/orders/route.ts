import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || session.user.role !== "admin") {
    return null;
  }

  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();

    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const orders = await Order.find({ status: "paid" })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load admin orders" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireAdmin();

    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();
    const orderId = String(body?.orderId || "").trim();
    const fulfillmentStatus = String(body?.fulfillmentStatus || "").trim();
    const courierName = String(body?.courierName || "").trim();
    const trackingNumber = String(body?.trackingNumber || "").trim();
    const estimatedDelivery = String(body?.estimatedDelivery || "").trim();
    const note = String(body?.note || "").trim();
    const location = String(body?.location || "").trim();

    if (!orderId || !fulfillmentStatus) {
      return NextResponse.json(
        { error: "Order ID and fulfillment status are required" },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "processing",
      "packed",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatuses.includes(fulfillmentStatus)) {
      return NextResponse.json({ error: "Invalid fulfillment status" }, { status: 400 });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    order.fulfillmentStatus = fulfillmentStatus;
    order.courierName = courierName;
    order.trackingNumber = trackingNumber;
    order.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
    order.trackingTimeline.push({
      status: fulfillmentStatus,
      title: fulfillmentStatus.replaceAll("_", " ").replace(/\b\w/g, (char: string) => char.toUpperCase()),
      description: note || "Shipment updated by admin.",
      location,
      createdAt: new Date(),
    });

    await order.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update order tracking" },
      { status: 500 }
    );
  }
}
