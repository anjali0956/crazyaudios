import Link from "next/link";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; receipt?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10 text-black sm:px-6 lg:px-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-green-600">
          Payment successful
        </p>
        <h1 className="text-3xl font-bold">Your order is confirmed</h1>
        <p className="mt-4 text-gray-600">
          Your payment has been verified successfully. You can download the invoice now or view
          this order later from your orders page.
        </p>

        <div className="mt-6 space-y-2 rounded-xl bg-gray-50 p-4">
          <p><span className="font-semibold">Order ID:</span> {params.order || "Not available"}</p>
          <p><span className="font-semibold">Receipt:</span> {params.receipt || "Not available"}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {params.order && (
            <a
              href={`/api/orders/${encodeURIComponent(params.order)}/invoice`}
              className="inline-flex items-center justify-center rounded-full bg-[#352f8f] px-6 py-3 font-semibold text-white"
            >
              Download Invoice PDF
            </a>
          )}
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
