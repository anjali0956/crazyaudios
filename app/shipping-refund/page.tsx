import InfoPageShell from "@/app/components/InfoPageShell";

export default function ShippingRefundPage() {
  return (
    <InfoPageShell
      title="Shipping & Refund"
      subtitle="Shipping timelines, packaging expectations, and refund guidelines."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-900">Shipping Window</h2>
        <p className="mt-2">
          Orders are usually processed during business hours, Monday to Saturday. Dispatch timing
          may vary depending on stock verification, courier availability, and delivery location.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Packaging and Handling</h2>
        <p className="mt-2">
          We pack audio components and electronics carefully to reduce transit damage. Please
          inspect the package at delivery and contact us promptly if there is visible damage.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Refund Eligibility</h2>
        <p className="mt-2">
          Refunds may be considered for incorrect items, transit-damaged products, or verified
          defects reported within a reasonable time after delivery. Approval depends on product
          condition and issue verification.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Support for Refund Requests</h2>
        <p className="mt-2">
          Please include your order details, product name, and clear photos or a short explanation
          of the issue when contacting support. This helps us resolve the request much faster.
        </p>
      </section>
    </InfoPageShell>
  );
}
