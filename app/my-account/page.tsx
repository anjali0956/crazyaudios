import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import InfoPageShell from "@/app/components/InfoPageShell";
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

function formatCurrency(value: number) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

export default async function MyAccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/my-account");
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
    <InfoPageShell
      title="My Account"
      subtitle="Your order history, invoices, and account shortcuts in one place."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-900">Account Shortcuts</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href="/cart" className="rounded-lg border border-gray-200 px-4 py-3 font-medium hover:bg-gray-50">
            View Cart
          </Link>
          <Link href="/checkout" className="rounded-lg border border-gray-200 px-4 py-3 font-medium hover:bg-gray-50">
            Go to Checkout
          </Link>
          <Link href="/orders" className="rounded-lg border border-gray-200 px-4 py-3 font-medium hover:bg-gray-50">
            My Orders
          </Link>
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Order History</h2>
            <p className="mt-1 text-sm text-gray-600">
              Signed in as {session.user.email}
            </p>
          </div>
          <Link href="/orders" className="text-sm font-semibold text-blue-700 hover:text-blue-900">
            Open full orders page
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            No orders found for this account yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {orders.map((order) => (
                  <tr key={order._id.toString()}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{order.receipt}</td>
                    <td className="px-4 py-3 text-gray-700">{order.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="px-4 py-3 text-blue-700">
                      {formatStatus(order.fulfillmentStatus || "processing")}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/track-your-order?receipt=${encodeURIComponent(order.receipt)}&email=${encodeURIComponent(order.customerEmail)}`}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Track
                        </Link>
                        <a
                          href={orderInvoicePath(order)}
                          className="rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                        >
                          Invoice
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Support</h2>
        <p className="mt-2">
          If you need help with an order, delivery update, or product recommendation, our support
          team can guide you through the next step.
        </p>
      </section>
    </InfoPageShell>
  );
}
