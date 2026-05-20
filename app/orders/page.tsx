import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/orders");
  }

  await dbConnect();

  const orders = await Order.find({
    $or: [{ userEmail: session.user.email }, { customerEmail: session.user.email }],
    status: "paid",
  })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 text-black sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-bold">My Orders</h1>

        {orders.length === 0 ? (
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-600">No paid orders found for this account yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order: any) => (
              <div key={order._id.toString()} className="rounded-xl bg-white p-6 shadow">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Invoice: {order.invoiceNumber}</p>
                    <h2 className="text-xl font-semibold">{order.receipt}</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Paid on {new Date(order.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-500">Total Paid</p>
                    <p className="text-2xl font-bold">₹{order.totalAmount}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2 border-t pt-4">
                  {order.items.map((item: any) => (
                    <div key={`${order._id}-${item.productId}`} className="flex justify-between gap-4 text-sm sm:text-base">
                      <span>{item.name} × {item.quantity}</span>
                      <span>₹{item.lineTotal}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={`/api/orders/${order._id.toString()}/invoice`}
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
