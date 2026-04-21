import InfoPageShell from "@/app/components/InfoPageShell";

export default function TermsOfServicePage() {
  return (
    <InfoPageShell
      title="Terms of Service"
      subtitle="General terms that apply to browsing, ordering, and using CrazyAudios."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-900">Product Information</h2>
        <p className="mt-2">
          We aim to keep product descriptions, pricing, availability, and images accurate.
          Small differences in packaging, manufacturing batch, or finish may occur.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Orders and Availability</h2>
        <p className="mt-2">
          Orders are subject to stock confirmation. In unusual cases where an item becomes
          unavailable after purchase, our team will contact you to offer an update, replacement,
          or refund path.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Customer Responsibilities</h2>
        <p className="mt-2">
          Customers are responsible for providing correct shipping information and ensuring that
          purchased components are suitable for their application, voltage, and system design.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Changes to These Terms</h2>
        <p className="mt-2">
          These terms may be updated as the store evolves. Continued use of the website means
          you accept the latest posted version.
        </p>
      </section>
    </InfoPageShell>
  );
}
