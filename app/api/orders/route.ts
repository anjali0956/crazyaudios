import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { CONFIRMED_ORDER_STATUSES } from "@/lib/order-utils";
import { ownedOrdersFilter } from "@/lib/order-access";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Only orders placed while signed in to this account (see lib/order-access.ts).
    const owned = await ownedOrdersFilter(session.user);
    if (!owned) return NextResponse.json([]);

    const orders = await Order.find({
      ...owned,
      status: { $in: CONFIRMED_ORDER_STATUSES },
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(orders);
  } catch (error) {
    console.error("[orders] Failed:", error);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
