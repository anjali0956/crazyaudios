"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type PendingOrder = {
  _id: string;
  receipt: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  razorpayOrderId: string;
  createdAt?: string;
};

type ReconcileSummary = {
  checked: number;
  markedPaid: Array<{ receipt: string; needsAttention: boolean }>;
  alreadyPaid: number;
  unpaid: number;
  authorizedNotCaptured: string[];
  errors: string[];
};

// Online orders still "created" 15+ minutes after checkout. Most are abandoned
// payments; "Check with Razorpay" confirms any that were in fact paid.
export default function PendingPayments({ onReconciled }: { onReconciled?: () => void }) {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [checking, setChecking] = useState(false);
  const [summary, setSummary] = useState<ReconcileSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/admin/orders", { params: { status: "created" } })
      .then((res) => {
        if (cancelled) return;
        setOrders(Array.isArray(res.data) ? res.data : []);
        setError("");
      })
      .catch(() => {
        if (cancelled) return;
        setOrders([]);
        setError("Could not load pending payments.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const checkWithRazorpay = async () => {
    setChecking(true);
    setError("");
    try {
      const res = await axios.post("/api/admin/reconcile-payments");
      setSummary(res.data);
      reload();
      onReconciled?.();
    } catch (err) {
      setError(
        (axios.isAxiosError(err) && err.response?.data?.error) || "Could not check payments with Razorpay."
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold text-amber-950">Payment pending (unverified)</h3>
          <p className="text-sm text-amber-900">
            Online orders not confirmed 15+ minutes after checkout. Most are abandoned payments.
            &quot;Check with Razorpay&quot; confirms any that were actually paid (last 7 days).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reload}
            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={checkWithRazorpay}
            disabled={checking}
            className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
          >
            {checking ? "Checking…" : "Check with Razorpay"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}

      {summary ? (
        <p className="mt-3 text-sm text-amber-950">
          Checked {summary.checked}. Confirmed as paid: {summary.markedPaid.length}
          {summary.markedPaid.length
            ? ` (${summary.markedPaid
                .map((order) => `${order.receipt}${order.needsAttention ? " – needs attention" : ""}`)
                .join(", ")})`
            : ""}
          . Not paid: {summary.unpaid}.
          {summary.authorizedNotCaptured.length
            ? ` Authorised but not captured (capture or refund in Razorpay): ${summary.authorizedNotCaptured.join(", ")}.`
            : ""}
          {summary.errors.length ? ` Could not check: ${summary.errors.join(", ")}.` : ""}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-3 text-sm text-amber-900">Loading pending payments...</p>
      ) : orders.length === 0 ? (
        <p className="mt-3 text-sm text-amber-900">No unconfirmed online orders.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-amber-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-2">Receipt</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Razorpay order</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order._id}>
                  <td className="px-3 py-2 font-semibold text-gray-900">{order.receipt}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">{order.customerName}</p>
                    <p className="text-xs text-gray-500">{order.customerPhone}</p>
                  </td>
                  <td className="px-3 py-2">Rs {Number(order.totalAmount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{order.razorpayOrderId}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
