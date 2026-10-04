import type { Metadata } from "next";
import { CheckoutView, type PaymentReturn } from "./CheckoutView";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

const RETURN_REASONS: PaymentReturn[] = ["failed", "cancelled", "verify"];

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; reason?: string }>;
}) {
  // ?payment=failed&reason=… is where /api/razorpay/callback sends a payment
  // that didn't complete (in-app browser redirect flow). Only known reasons are
  // shown, with fixed copy, so the URL can't put arbitrary text on the page.
  const { payment, reason } = await searchParams;
  const paymentReturn =
    payment === "failed" ? (RETURN_REASONS.find((known) => known === reason) ?? "failed") : null;

  return (
    <main className="page-wrap pb-28 lg:pb-16 lg:pt-8">
      <CheckoutView paymentReturn={paymentReturn} />
    </main>
  );
}
