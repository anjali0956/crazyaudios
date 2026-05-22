"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import InfoPageShell from "@/app/components/InfoPageShell";

type TrackingEvent = {
  status: string;
  title: string;
  description?: string;
  location?: string;
  createdAt: string;
};

type TrackingOrder = {
  receipt: string;
  invoiceNumber: string;
  fulfillmentStatus: string;
  courierName: string;
  trackingNumber: string;
  estimatedDelivery: string | null;
  trackingTimeline: TrackingEvent[];
  shippingAddress: {
    city: string;
    state: string;
    pincode: string;
  };
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
  }>;
};

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

type Props = {
  initialReceipt: string;
  initialEmail: string;
};

export default function TrackYourOrderClient({
  initialReceipt,
  initialEmail,
}: Props) {
  const [receipt, setReceipt] = useState(initialReceipt);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<TrackingOrder | null>(null);

  const loadTracking = async (incomingReceipt = receipt, incomingEmail = email) => {
    if (!incomingReceipt.trim() || !incomingEmail.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await axios.post("/api/track-order", {
        receipt: incomingReceipt.trim(),
        email: incomingEmail.trim(),
      });
      setOrder(res.data);
    } catch (err: any) {
      setOrder(null);
      setError(err?.response?.data?.error || "We could not fetch tracking details right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialReceipt && initialEmail) {
      loadTracking(initialReceipt, initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReceipt, initialEmail]);

  return (
    <InfoPageShell
      title="Track Your Order"
      subtitle="Enter your order receipt and email to view current shipment status and updates."
    >
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <form
          className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            loadTracking();
          }}
        >
          <input
            type="text"
            value={receipt}
            onChange={(e) => setReceipt(e.target.value)}
            placeholder="Order receipt (example: CA-...)"
            className="rounded-lg border border-gray-300 px-4 py-3"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email used during checkout"
            className="rounded-lg border border-gray-300 px-4 py-3"
          />
          <button
            type="submit"
            className="rounded-lg bg-black px-6 py-3 font-semibold text-white"
          >
            {loading ? "Checking..." : "Track Order"}
          </button>
        </form>

        {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
      </section>

      {order ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Current Status</p>
              <p className="mt-2 text-xl font-bold text-blue-700">
                {formatStatus(order.fulfillmentStatus)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Estimated Delivery</p>
              <p className="mt-2 text-lg font-semibold">
                {order.estimatedDelivery
                  ? new Date(order.estimatedDelivery).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Will be updated soon"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Courier</p>
              <p className="mt-2 text-lg font-semibold">
                {order.courierName || "Pending assignment"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Tracking Number</p>
              <p className="mt-2 text-lg font-semibold">
                {order.trackingNumber || "Not available yet"}
              </p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Tracking Timeline</h2>
              <div className="mt-6 space-y-6">
                {[...order.trackingTimeline]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  )
                  .map((event, index) => (
                    <div key={`${event.status}-${event.createdAt}-${index}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-4 w-4 rounded-full bg-blue-600" />
                        {index !== order.trackingTimeline.length - 1 ? (
                          <div className="mt-2 h-full min-h-10 w-0.5 bg-blue-200" />
                        ) : null}
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                          {formatStatus(event.status)}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-gray-900">{event.title}</h3>
                        {event.description ? (
                          <p className="mt-1 text-sm text-gray-600">{event.description}</p>
                        ) : null}
                        <div className="mt-2 text-xs text-gray-500">
                          <span>{new Date(event.createdAt).toLocaleString("en-IN")}</span>
                          {event.location ? <span> • {event.location}</span> : null}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">Order Snapshot</h2>
                <div className="mt-4 space-y-3 text-sm text-gray-700">
                  <p>
                    <span className="font-medium text-gray-900">Receipt:</span> {order.receipt}
                  </p>
                  <p>
                    <span className="font-medium text-gray-900">Invoice:</span> {order.invoiceNumber}
                  </p>
                  <p>
                    <span className="font-medium text-gray-900">Destination:</span>{" "}
                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                  </p>
                  <p>
                    <span className="font-medium text-gray-900">Total Paid:</span> ₹{order.totalAmount}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">Items in This Order</h2>
                <div className="mt-4 space-y-3">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between text-sm text-gray-700"
                    >
                      <span>{item.name}</span>
                      <span className="font-medium">× {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </>
      ) : null}

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Need Help?</h2>
        <p className="mt-2">
          If a tracking number has not been assigned yet, your order is likely still being
          packed. For help, contact <strong>craudyaudios@gmail.com</strong> or call
          <strong> +91-9656006900</strong> during working hours.
        </p>
      </section>
    </InfoPageShell>
  );
}
