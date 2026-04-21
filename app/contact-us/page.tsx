import InfoPageShell from "@/app/components/InfoPageShell";

export default function ContactUsPage() {
  return (
    <InfoPageShell
      title="Contact Us"
      subtitle="Reach out for support, product questions, and order-related help."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-900">Email</h2>
        <p className="mt-2">craudyaudios@gmail.com</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Phone</h2>
        <p className="mt-2">+91-9656006900</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Support Hours</h2>
        <p className="mt-2">9:15 AM to 6:15 PM, Monday to Saturday</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Best Way to Contact Us</h2>
        <p className="mt-2">
          For order support, please include your order details, product name, and the issue you are
          facing. That helps us reply much faster and more accurately.
        </p>
      </section>
    </InfoPageShell>
  );
}
