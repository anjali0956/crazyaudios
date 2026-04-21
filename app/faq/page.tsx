import InfoPageShell from "@/app/components/InfoPageShell";

export default function FaqPage() {
  return (
    <InfoPageShell
      title="FAQ"
      subtitle="Answers to common questions from customers and builders."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-900">Do you sell original products?</h2>
        <p className="mt-2">
          We focus on sourcing from original and reputed dealers wherever available, especially for
          audio parts and sensitive electronic components.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Can I ask for help choosing parts?</h2>
        <p className="mt-2">
          Yes. If you are comparing woofers, tweeters, amplifiers, tone control modules, or ICs,
          you can contact us with your project details and we will guide you as best we can.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">What if a product goes out of stock?</h2>
        <p className="mt-2">
          Some items may return after restocking. If a part is important for your build, contact us
          and we can let you know whether a restock or alternative is available.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Do you offer support after purchase?</h2>
        <p className="mt-2">
          We provide reasonable product guidance and order support, especially for shipping,
          availability, and basic compatibility questions.
        </p>
      </section>
    </InfoPageShell>
  );
}
