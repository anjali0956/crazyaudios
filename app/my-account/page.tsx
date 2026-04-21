import Link from "next/link";
import InfoPageShell from "@/app/components/InfoPageShell";

export default function MyAccountPage() {
  return (
    <InfoPageShell
      title="My Account"
      subtitle="Quick access to the parts of the store you will probably use most."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-900">Account Shortcuts</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href="/login" className="rounded-lg border border-gray-200 px-4 py-3 font-medium hover:bg-gray-50">
            Login
          </Link>
          <Link href="/register" className="rounded-lg border border-gray-200 px-4 py-3 font-medium hover:bg-gray-50">
            Register
          </Link>
          <Link href="/cart" className="rounded-lg border border-gray-200 px-4 py-3 font-medium hover:bg-gray-50">
            View Cart
          </Link>
          <Link href="/checkout" className="rounded-lg border border-gray-200 px-4 py-3 font-medium hover:bg-gray-50">
            Go to Checkout
          </Link>
        </div>
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
