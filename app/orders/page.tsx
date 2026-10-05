import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { CONFIRMED_ORDER_STATUSES } from "@/lib/order-utils";
import { orderInvoicePath, ownedOrdersFilter } from "@/lib/order-access";

type AccountOrder = {
  _id: { toString(): string };
  receipt: string;
  invoiceNumber: string;
  paymentMethod?: string;
  createdAt: Date;
  fulfillmentStatus?: string;
  estimatedDelivery?: Date | null;
  totalAmount: number;
  customerEmail: string;
  items: Array<{ productId: unknown; name: string; quantity: number; lineTotal: number }>;
};

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/orders");
  }

  await dbConnect();

  // Only orders placed while signed in to this account (see lib/order-access.ts).
  const owned = await ownedOrdersFilter(session.user);
  const orders = owned
    ? await Order.find({ ...owned, status: { $in: CONFIRMED_ORDER_STATUSES } })
        .sort({ createdAt: -1 })
        .lean<AccountOrder[]>()
    : [];

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 text-black sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-bold">My Orders</h1>

        {orders.length === 0 ? (
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-600">No orders found for this account yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => (
              <div key={order._id.toString()} className="rounded-xl bg-white p-6 shadow">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Invoice: {order.invoiceNumber}</p>
                    <h2 className="text-xl font-semibold">{order.receipt}</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {order.paymentMethod === "cod" ? "Ordered on" : "Paid on"}{" "}
                      {new Date(order.createdAt).toLocaleString("en-IN")}
                    </p>
                    <p className="mt-2 text-sm font-medium text-blue-700">
                      Status: {formatStatus(order.fulfillmentStatus || "processing")}
                    </p>
                    {order.estimatedDelivery ? (
                      <p className="mt-1 text-sm text-gray-600">
                        Estimated delivery:{" "}
                        {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-500">
                      {order.paymentMethod === "cod" ? "Pay on Delivery (Cash)" : "Total Paid"}
                    </p>
                    <p className="text-2xl font-bold">₹{order.totalAmount}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2 border-t pt-4">
                  {order.items.map((item) => (
                    <div
                      key={`${order._id}-${item.productId}`}
                      className="flex justify-between gap-4 text-sm sm:text-base"
                    >
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span>₹{item.lineTotal}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/track-your-order?receipt=${encodeURIComponent(order.receipt)}&email=${encodeURIComponent(order.customerEmail)}`}
                    className="inline-flex items-center justify-center rounded-full bg-blue-700 px-6 py-3 font-semibold text-white"
                  >
                    Track Order
                  </Link>
                  <a
                    href={orderInvoicePath(order)}
                    className="inline-flex items-center justify-center rounded-full bg-[#352f8f] px-6 py-3 font-semibold text-white"
                  >
                    Download Invoice PDF
                  </a>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
