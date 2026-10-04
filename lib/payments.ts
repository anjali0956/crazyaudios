import mongoose from "mongoose";
import Order from "@/models/Order";
import { sendMetaPurchaseEvent } from "@/lib/meta-capi";
import { assignInvoiceNumber } from "@/lib/invoice-number";
import { takeStock } from "@/lib/stock";
import { absoluteUrl } from "@/lib/site";

// One routine marks a prepaid order as paid, whichever path learns about the
// payment first: the browser (verify-payment), Razorpay's webhook, or the admin
// reconcile button. The created -> paid switch is a single atomic update, so
// when two of them race exactly one wins and does the follow-up work (stock,
// invoice number, timeline, Meta Purchase); the others see "already_paid".

export type PaymentSource = "verify-payment" | "webhook" | "reconcile";

export type MarkOrderPaidInput = {
  orderId?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature?: string;
  source: PaymentSource;
  // Extra cross-checks from a webhook payload: when given they must match too.
  receipt?: string;
  // Amount Razorpay says was captured, in paise; a mismatch flags the order.
  amountPaise?: number;
  // The customer's own request (verify-payment), used for Meta matching.
  // Server-to-server callers leave it out so Razorpay's IP isn't sent as the buyer's.
  request?: Request;
  // Run the Meta event after the response instead of inline (e.g. next/server `after`).
  defer?: (task: () => Promise<void>) => void;
};

export type OrderSummary = {
  id: string;
  receipt: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  needsAttention: boolean;
};

export type MarkOrderPaidResult =
  | { outcome: "paid"; order: OrderSummary; stockShortage: boolean }
  | { outcome: "already_paid"; order: OrderSummary }
  | { outcome: "not_payable"; order: OrderSummary }
  | { outcome: "not_found" };

// "failed" is included because the old verify-payment could wrongly mark any
// order failed; a payment Razorpay confirms as captured is authoritative.
const PAYABLE_STATUSES = ["created", "failed"];

export const STOCK_SHORTAGE_REASON = "Stock shortage after payment — refund or back-order";

type OrderForCapi = Parameters<typeof sendMetaPurchaseEvent>[0];

type LeanOrder = {
  _id: unknown;
  receipt?: string;
  invoiceNumber?: string;
  status?: string;
  totalAmount?: number;
  needsAttention?: boolean;
};

function summarize(order: LeanOrder): OrderSummary {
  return {
    id: String(order._id),
    receipt: String(order.receipt || ""),
    invoiceNumber: String(order.invoiceNumber || ""),
    status: String(order.status || ""),
    totalAmount: Number(order.totalAmount || 0),
    needsAttention: Boolean(order.needsAttention),
  };
}

// A request carrying no browser headers, for events reported server to server.
function serverRequest() {
  return new Request(absoluteUrl("/checkout"));
}

// Sends the Meta Purchase event at most once per order: metaPurchaseSentAt is
// claimed atomically first, and released again if Meta didn't accept the event.
export async function sendPurchaseEventOnce(order: OrderForCapi, request: Request) {
  try {
    const claim = await Order.updateOne(
      { _id: order._id, metaPurchaseSentAt: null },
      { $set: { metaPurchaseSentAt: new Date() } }
    );
    if (claim.modifiedCount !== 1) return false;

    const sent = await sendMetaPurchaseEvent(order, request);
    if (!sent) {
      await Order.updateOne({ _id: order._id }, { $set: { metaPurchaseSentAt: null } });
    }
    return sent;
  } catch (error) {
    console.warn(`[payments] Meta Purchase for order ${String(order._id)} not sent:`, error);
    return false;
  }
}

async function completePaidOrder(
  order: {
    _id: unknown;
    totalAmount: number;
    items: Array<{ productId: unknown; name?: string; quantity: number }>;
    trackingTimeline?: unknown[];
  },
  input: MarkOrderPaidInput,
  paidAt: Date
) {
  const stock = await takeStock(
    order.items.map((item) => ({ productId: item.productId, name: item.name, quantity: item.quantity }))
  );

  const reasons: string[] = [];
  if (!stock.ok) {
    reasons.push(`${STOCK_SHORTAGE_REASON} (${stock.shortItem})`);
    console.warn(`[payments] Order ${String(order._id)} paid but out of stock: ${stock.shortItem}`);
  }
  if (
    input.amountPaise !== undefined &&
    Number.isFinite(input.amountPaise) &&
    input.amountPaise !== Math.round(Number(order.totalAmount) * 100)
  ) {
    reasons.push(
      `Razorpay reports Rs ${input.amountPaise / 100} paid but the order total is Rs ${order.totalAmount}`
    );
  }

  const set: Record<string, unknown> = { stockDeducted: stock.ok };
  if (reasons.length) {
    set.needsAttention = true;
    set.attentionReason = reasons.join("; ");
  }

  const update: Record<string, unknown> = { $set: set };
  if (!stock.ok) {
    // Customer-facing (shown on Track order); the admin sees attentionReason.
    update.$push = {
      trackingTimeline: {
        status: "processing",
        title: "Payment Received",
        description:
          "Payment received. We are confirming stock for your items and will contact you shortly.",
        location: "CrazyAudios Warehouse",
        createdAt: paidAt,
      },
    };
  } else if (!order.trackingTimeline?.length) {
    update.$push = {
      trackingTimeline: {
        status: "processing",
        title: "Order Confirmed",
        description: "Payment verified successfully. We are preparing your shipment.",
        location: "CrazyAudios Warehouse",
        createdAt: paidAt,
      },
    };
  }

  await Order.updateOne({ _id: order._id }, update);
  await assignInvoiceNumber(order._id);
  return stock.ok;
}

export async function markOrderPaid(input: MarkOrderPaidInput): Promise<MarkOrderPaidResult> {
  const razorpayOrderId = String(input.razorpayOrderId || "").trim();
  const razorpayPaymentId = String(input.razorpayPaymentId || "").trim();
  if (!razorpayOrderId || !razorpayPaymentId) return { outcome: "not_found" };

  const match: Record<string, unknown> = { razorpayOrderId };
  if (input.orderId) {
    if (!mongoose.isValidObjectId(input.orderId)) return { outcome: "not_found" };
    match._id = input.orderId;
  }
  if (input.receipt) match.receipt = String(input.receipt);

  const paidAt = new Date();
  const set: Record<string, unknown> = {
    status: "paid",
    razorpayPaymentId,
    paidAt,
    paymentSource: input.source,
  };
  if (input.signature) set.razorpaySignature = input.signature;

  const order = await Order.findOneAndUpdate(
    { ...match, status: { $in: PAYABLE_STATUSES } },
    { $set: set },
    { returnDocument: "after" }
  );

  if (!order) {
    const existing = await Order.findOne(match)
      .select("receipt invoiceNumber status totalAmount needsAttention")
      .lean<LeanOrder>();
    if (!existing) return { outcome: "not_found" };
    return existing.status === "paid"
      ? { outcome: "already_paid", order: summarize(existing) }
      : { outcome: "not_payable", order: summarize(existing) };
  }

  console.info(`[payments] Order ${String(order._id)} marked paid via ${input.source} (${razorpayPaymentId})`);

  // From here on the payment is real: never throw at the customer. Anything
  // that fails is flagged for the admin instead.
  let stockOk = true;
  try {
    stockOk = await completePaidOrder(order, input, paidAt);
  } catch (error) {
    stockOk = false;
    console.error(`[payments] Order ${String(order._id)} is paid but the follow-up failed:`, error);
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          needsAttention: true,
          attentionReason: "Paid, but updating stock or the invoice number failed: check both by hand",
        },
      }
    ).catch(() => undefined);
  }

  const latest = await Order.findById(order._id).lean();
  const sendEvent = async () => {
    await sendPurchaseEventOnce((latest || order) as OrderForCapi, input.request ?? serverRequest());
  };
  if (input.defer) input.defer(sendEvent);
  else await sendEvent();

  return {
    outcome: "paid",
    order: summarize((latest || order) as LeanOrder),
    stockShortage: !stockOk,
  };
}
