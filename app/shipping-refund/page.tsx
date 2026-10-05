import InfoPageShell from "@/app/components/InfoPageShell";
import {
  COD_ENABLED,
  COD_MAX_ORDER_VALUE,
  FREE_SHIPPING_THRESHOLD,
  formatRupees,
} from "@/lib/shipping-policy";

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
        <h2 className="text-xl font-semibold text-gray-900">Shipping Charges</h2>
        <p className="mt-2">
          Shipping is charged at the live courier rate for your pincode, shown at checkout before
          you pay.
          {FREE_SHIPPING_THRESHOLD > 0
            ? ` Orders with a products total of ${formatRupees(FREE_SHIPPING_THRESHOLD)} or more (incl. GST) ship free with our standard courier. If you pick a faster courier, you pay only the difference.`
            : ""}
        </p>
      </section>

      {COD_ENABLED ? (
        <section>
          <h2 className="text-xl font-semibold text-gray-900">Cash on Delivery</h2>
          <p className="mt-2">
            Cash on Delivery is available on orders up to {formatRupees(COD_MAX_ORDER_VALUE)}. The
            courier&apos;s COD charge is added to the shipping fee and shown at checkout. Please pay
            the delivery agent in cash when your parcel arrives.
          </p>
        </section>
      ) : null}

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
