import { after, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { markOrderPaid } from "@/lib/payments";
import { fetchOrderPayments, getRazorpayClient } from "@/lib/razorpay";

// Admin safety net for missed confirmations (e.g. before the webhook was set
// up, or while it was failing): asks Razorpay about every unconfirmed online
// order from the last 7 days and confirms the ones whose payment was captured.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ORDERS = 200;
const CONCURRENCY = 4;

type Candidate = { _id: unknown; receipt: string; razorpayOrderId: string };

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let razorpay: ReturnType<typeof getRazorpayClient>;
  try {
    razorpay = getRazorpayClient();
  } catch (error) {
    console.error("[reconcile-payments]", error);
    return NextResponse.json({ error: "Razorpay keys are not configured on the server." }, { status: 503 });
  }

  try {
    await dbConnect();
    const candidates = await Order.find({
      status: { $in: ["created", "failed"] },
      createdAt: { $gte: new Date(Date.now() - LOOKBACK_MS) },
      razorpayOrderId: { $regex: /^order_/ },
    })
      .sort({ createdAt: -1 })
      .limit(MAX_ORDERS)
      .select("_id receipt razorpayOrderId")
      .lean<Candidate[]>();

    const summary = {
      checked: 0,
      markedPaid: [] as Array<{ receipt: string; needsAttention: boolean }>,
      alreadyPaid: 0,
      unpaid: 0,
      // Authorised but not captured: capture or refund these in the Razorpay Dashboard.
      authorizedNotCaptured: [] as string[],
      errors: [] as string[],
    };

    const queue = [...candidates];
    const worker = async () => {
      for (let order = queue.shift(); order; order = queue.shift()) {
        summary.checked += 1;
        try {
          const payments = await fetchOrderPayments(razorpay, order.razorpayOrderId);
          const captured = payments.find((payment) => payment.status === "captured");

          if (!captured) {
            if (payments.some((payment) => payment.status === "authorized")) {
              summary.authorizedNotCaptured.push(order.receipt);
            } else {
              summary.unpaid += 1;
            }
            continue;
          }

          const result = await markOrderPaid({
            razorpayOrderId: order.razorpayOrderId,
            razorpayPaymentId: captured.id,
            amountPaise: captured.amount || undefined,
            source: "reconcile",
            defer: (task) => after(task),
          });

          if (result.outcome === "paid") {
            summary.markedPaid.push({ receipt: order.receipt, needsAttention: result.order.needsAttention });
          } else if (result.outcome === "already_paid") {
            summary.alreadyPaid += 1;
          } else {
            summary.errors.push(order.receipt);
          }
        } catch (error) {
          console.error(`[reconcile-payments] ${order.receipt} (${order.razorpayOrderId}):`, error);
          summary.errors.push(order.receipt);
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    console.info(
      `[reconcile-payments] checked ${summary.checked}, confirmed ${summary.markedPaid.length}, ` +
        `unpaid ${summary.unpaid}, errors ${summary.errors.length}`
    );
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[reconcile-payments] Failed:", error);
    return NextResponse.json({ error: "Could not check payments right now." }, { status: 500 });
  }
}
