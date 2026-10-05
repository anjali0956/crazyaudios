import Link from "next/link";
import dbConnect from "@/lib/mongodb";
import { findOrderByIdAndReceipt, orderInvoicePath } from "@/lib/order-access";
import { CONFIRMED_ORDER_STATUSES } from "@/lib/order-utils";
import PurchaseTracker from "./PurchaseTracker";
import ClearPaidCart from "./ClearPaidCart";

export const dynamic = "force-dynamic";

function formatRupees(value: unknown) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

type SuccessOrder = {
  _id: unknown;
  receipt: string;
  status: string;
  paymentMethod?: string;
  totalAmount: number;
  customerEmail?: string;
  stockDeducted?: boolean;
};

// The order is read on the server; the id and receipt in the URL must both
// match, so the page never trusts query parameters for status or amounts.
async function loadOrder(orderId?: string, receipt?: string) {
  if (!orderId || !receipt) return null;
  try {
    await dbConnect();
    return (await findOrderByIdAndReceipt(orderId, receipt)) as SuccessOrder | null;
  } catch (error) {
    console.error("[checkout/success] Order lookup failed:", error);
    return null;
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; receipt?: string; method?: string }>;
}) {
  const params = await searchParams;
  const order = await loadOrder(params.order, params.receipt);

  if (!order) {
    return (
      <main className="min-h-screen bg-gray-100 px-4 py-10 text-black sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold">We couldn&apos;t find that order</h1>
          <p className="mt-4 text-gray-600">
            Please check the link from your order confirmation, or look the order up with your
            receipt number and email.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/track-your-order"
              className="inline-flex items-center justify-center rounded-full bg-[#352f8f] px-6 py-3 font-semibold text-white"
            >
              Track your order
            </Link>
            <Link
              href="/orders"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700"
            >
              View My Orders
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const orderId = String(order._id);
  const isCod = order.status === "cod";
  const isConfirmed = CONFIRMED_ORDER_STATUSES.includes(order.status);
  const isPending = order.status === "created";
  const amount = formatRupees(order.totalAmount);
  const trackHref = `/track-your-order?receipt=${encodeURIComponent(order.receipt)}&email=${encodeURIComponent(order.customerEmail || "")}`;

  const kicker = isCod
    ? "Order placed – Cash on Delivery"
    : order.status === "paid"
      ? "Payment successful"
      : isPending
        ? "Payment processing"
        : "Payment not confirmed";
  const heading = isConfirmed
    ? "Your order is confirmed"
    : isPending
      ? "We're confirming your payment"
      : "We couldn't confirm this payment";
  const message = isCod
    ? `Keep ${amount} ready to pay in cash when your parcel arrives. You can download the invoice now or view this order later from your orders page.`
    : order.status === "paid"
      ? `We've received your payment of ${amount}. You can download the invoice now or view this order later from your orders page.`
      : isPending
        ? "If money was taken from your account, your order is confirmed automatically within a few minutes. Refresh this page, or check Track your order. Please don't pay again."
        : "If money was taken from your account, message us on WhatsApp with your receipt number and we'll sort it out.";

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10 text-black sm:px-6 lg:px-10">
      {isConfirmed ? <PurchaseTracker orderId={orderId} /> : null}
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow">
        <p
          className={`mb-3 text-sm font-semibold uppercase tracking-wide ${
            isConfirmed ? "text-green-600" : "text-amber-700"
          }`}
        >
          {kicker}
        </p>
        <h1 className="text-3xl font-bold">{heading}</h1>
        <p className="mt-4 text-gray-600">{message}</p>
        {order.status === "paid" && order.stockDeducted === false ? (
          <p className="mt-3 text-gray-600">
            We&apos;re double-checking stock for one of your items and will contact you shortly.
          </p>
        ) : null}

        <div className="mt-6 space-y-2 rounded-xl bg-gray-50 p-4">
          <p><span className="font-semibold">Receipt:</span> {order.receipt}</p>
          <p>
            <span className="font-semibold">
              {isCod ? "Pay on delivery:" : order.status === "paid" ? "Amount paid:" : "Order total:"}
            </span>{" "}
            {amount}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {isConfirmed ? (
            <a
              href={orderInvoicePath(order)}
              className="inline-flex items-center justify-center rounded-full bg-[#352f8f] px-6 py-3 font-semibold text-white"
            >
              Download Invoice PDF
            </a>
          ) : null}
          <Link
            href={trackHref}
            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700"
          >
            Track your order
          </Link>
          <Link
            href="/orders"
            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700"
          >
            View My Orders
          </Link>
        </div>
      </div>
      {isConfirmed ? <ClearPaidCart orderId={orderId} /> : null}
    </main>
  );
}
