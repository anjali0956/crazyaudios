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

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Payments, Delivery and Accounts</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>Payments.</strong> Online payments are processed by Razorpay. With your order we
            share your name, email address, phone number and delivery address with Razorpay, along
            with the order amount and receipt number. You enter your card, UPI or netbanking details
            with Razorpay; they never reach us. Cash on Delivery orders are not sent to Razorpay.
          </li>
          <li>
            <strong>Delivery.</strong> To quote shipping, we send your delivery PIN code and the
            parcel weight to our shipping-rate service. Our courier partners receive your name,
            delivery address and phone number so they can deliver your order.
          </li>
          <li>
            <strong>Accounts.</strong> If you create an account, we store your name, your email
            address and a securely hashed version of your password. Your cart is kept in your own
            browser.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Meta Pixel</h2>
        <p className="mt-2">
          We advertise on Facebook and Instagram and use Meta&apos;s tools to measure which ads lead
          to visits and orders.
        </p>
        <p className="mt-2">
          Our pages load the Meta Pixel, a measurement script from Meta (the company behind Facebook
          and Instagram). It tells Meta which pages you visit, and when you view a product, add
          something to your cart, start checkout, complete a purchase or tap one of our WhatsApp
          links, along with the product IDs, quantities and prices involved. As with any web
          request, Meta also receives your IP address and browser details, and the Pixel uses
          cookies (such as _fbp) to recognise your browser. Depending on Meta&apos;s matching
          settings, the Pixel may also hash contact details you type into our forms, such as your
          email address or phone number, in your browser and send them with these events.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Meta Conversions API</h2>
        <p className="mt-2">
          When your order is confirmed (when you place a Cash on Delivery order, or when your online
          payment goes through), our server also reports the purchase directly to Meta through the
          Meta Conversions API, so the sale is counted even if your browser blocks the Pixel. With
          it we send:
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            your email address, phone number, first and last name, city, state, PIN code and
            country, each in <strong>hashed form</strong>: converted with SHA-256 into a fixed code,
            so the details themselves are not sent in readable form;
          </li>
          <li>
            the order ID, value and currency, and the product IDs, quantities and prices in the
            order;
          </li>
          <li>
            your IP address and browser details, and Meta&apos;s browser and ad-click identifiers
            (the _fbp and _fbc cookies, or the fbclid tag of the ad you arrived from) when they are
            available.
          </li>
        </ul>
        <p className="mt-2">
          Meta compares the hashed details with its own records to work out whether an ad led to the
          purchase. Your street address is not sent. Meta handles the information it receives under
          its own terms and privacy policy.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Ad and Campaign Tags</h2>
        <p className="mt-2">
          If you arrive from one of our ads or a link with campaign tags (such as utm_source or
          Meta&apos;s fbclid), your browser stores those tags along with the page you landed on and
          the site that sent you. An order you place within 30 days is saved with them, so we can
          see which ads lead to orders.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Visit Counts</h2>
        <p className="mt-2">
          We also count visits ourselves. For each page you open, our server records the page
          address, your browser type and a random visitor ID kept in your browser. We use this only
          to see how many people visit and which pages they read.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Your Choices</h2>
        <p className="mt-2">
          You can block or clear cookies and site data in your browser settings, or use a content
          blocker; the store works without the Pixel. To control how Meta uses your activity for
          ads, use the ad preferences in your Facebook or Instagram account.
        </p>
      </section>
    </InfoPageShell>
  );
}
