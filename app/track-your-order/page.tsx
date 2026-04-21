import InfoPageShell from "@/app/components/InfoPageShell";

export default function TrackYourOrderPage() {
  return (
    <InfoPageShell
      title="Track Your Order"
      subtitle="Use your order details to check current delivery progress."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-900">How to Track</h2>
        <p className="mt-2">
          Keep your order confirmation details ready. If a tracking number has been shared,
          you can follow the shipment directly with the courier service. If you have not received
          tracking details yet, please contact our support team with your name and order date.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Need Help?</h2>
        <p className="mt-2">
          For manual assistance, write to <strong>craudyaudios@gmail.com</strong> or call
          <strong> +91-9656006900</strong> during working hours.
        </p>
      </section>
    </InfoPageShell>
  );
}
