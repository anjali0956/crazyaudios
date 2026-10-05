import InfoPageShell from "@/app/components/InfoPageShell";

export default function PrivacyPolicyPage() {
  return (
    <InfoPageShell
      title="Privacy Policy"
      subtitle="How CrazyAudios collects, uses, and protects customer information."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-900">Information We Collect</h2>
        <p className="mt-2">
          We collect the details needed to process purchases, respond to customer questions,
          and improve the shopping experience. This may include your name, email address,
          phone number, shipping address, and order history.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">How We Use Your Information</h2>
        <p className="mt-2">
          Your information is used to confirm orders, arrange delivery, provide support,
          and share important purchase updates. We may also use limited data to improve site
          performance and product recommendations.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Data Protection</h2>
        <p className="mt-2">
          We take reasonable technical and administrative steps to protect customer data from
          unauthorized access, alteration, or disclosure. Sensitive login and account details
          should always be kept private on your side as well.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Third-Party Services</h2>
        <p className="mt-2">
          Delivery, payment, and authentication providers may process limited order-related
          information only to complete the service requested by you.
        </p>
      </section>
    </InfoPageShell>
  );
}
