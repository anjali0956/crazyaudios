import type { Metadata } from "next";
import InfoPageShell from "@/app/components/InfoPageShell";
import { InfoSection } from "@/app/components/content/InfoSection";
import { sectionNumber } from "@/app/components/content/PageContents";
import { SUPPORT_EMAIL, WHATSAPP_DISPLAY } from "@/app/components/chrome/links";
import { WhatsAppLink } from "@/app/components/chrome/TrackedLink";
import { DEFAULT_OPEN_GRAPH, whatsappLink } from "@/lib/site";

const DESCRIPTION =
  "How CrazyAudios collects, uses and protects your information, including the Meta Pixel and Conversions API we use to measure ads, and what Razorpay and couriers receive.";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy-policy" },
  openGraph: { ...DEFAULT_OPEN_GRAPH, url: "/privacy-policy", title: "CrazyAudios privacy policy", description: DESCRIPTION },
};

const SECTIONS = [
  { id: "information-we-collect", label: "Information we collect" },
  { id: "how-we-use-it", label: "How we use your information" },
  { id: "analytics-advertising", label: "Analytics and advertising" },
  { id: "payments-delivery", label: "Payments, delivery and accounts" },
  { id: "data-protection", label: "Data protection" },
  { id: "questions", label: "Questions" },
];

const n = (id: string) => sectionNumber(SECTIONS.findIndex((section) => section.id === id));
const title = (id: string) => SECTIONS.find((section) => section.id === id)?.label ?? "";

// What lib/meta-capi.ts sends is described exactly in "Meta Conversions API".
export default function PrivacyPolicyPage() {
  return (
    <InfoPageShell
      kicker="Policies"
      title="Privacy policy"
      subtitle="How CrazyAudios collects, uses and protects customer information."
      meta="Updated October 2026"
      contents={SECTIONS}
    >
      <InfoSection id="information-we-collect" number={n("information-we-collect")} title={title("information-we-collect")}>
        <p>
          We collect the details needed to process purchases, respond to customer questions and improve the shopping
          experience. This may include your name, email address, phone number, shipping address and order history.
        </p>
      </InfoSection>

      <InfoSection id="how-we-use-it" number={n("how-we-use-it")} title={title("how-we-use-it")}>
        <p>
          Your information is used to confirm orders, arrange delivery, provide support and share important purchase
          updates. We may also use limited data to improve site performance and product recommendations.
        </p>
      </InfoSection>

      <InfoSection id="analytics-advertising" number={n("analytics-advertising")} title={title("analytics-advertising")}>
        <p>
          We advertise on Facebook and Instagram and use Meta&apos;s tools to measure which ads lead to visits and
          orders. This is exactly what that involves.
        </p>

        <h3>Meta Pixel</h3>
        <p>
          Our pages load the Meta Pixel, a measurement script from Meta (the company behind Facebook and Instagram).
          It tells Meta which pages you visit, and when you view a product, add something to your cart, start
          checkout, complete a purchase or tap one of our WhatsApp links, along with the product IDs, quantities and
          prices involved. As with any web request, Meta also receives your IP address and browser details, and the
          Pixel uses cookies (such as <code className="type-mono text-[14px] text-ink">_fbp</code>) to recognise
          your browser. Depending on Meta&apos;s matching settings, the Pixel may also hash contact details you type
          into our forms, such as your email address or phone number, in your browser and send them with these
          events.
        </p>

        <h3>Meta Conversions API</h3>
        <p>
          When you place an order, our server also reports the purchase directly to Meta through the Meta
          Conversions API, so the sale is counted even if your browser blocks the Pixel. With it we send:
        </p>
        <ul>
          <li>
            your email address, phone number, first and last name, city, state, PIN code and country, each in{" "}
            <strong>hashed form</strong>: converted with SHA-256 into a fixed code, so the details themselves are
            not sent in readable form;
          </li>
          <li>the order ID and value, and the products, quantities and prices in the order;</li>
          <li>
            your IP address and browser details, and Meta&apos;s browser and ad-click identifiers (the{" "}
            <code className="type-mono text-[14px] text-ink">_fbp</code> and{" "}
            <code className="type-mono text-[14px] text-ink">_fbc</code> cookies) when they are available.
          </li>
        </ul>
        <p>
          Meta compares the hashed details with its own records to work out whether an ad led to the purchase. Your
          street address is not sent. Meta handles the information it receives under its own terms and privacy
          policy.
        </p>

        <h3>Ad and campaign tags</h3>
        <p>
          If you arrive from one of our ads or a link with campaign tags (such as{" "}
          <code className="type-mono text-[14px] text-ink">utm_source</code> or Meta&apos;s{" "}
          <code className="type-mono text-[14px] text-ink">fbclid</code>), your browser keeps those tags for up to
          30 days and they are saved with your order, so we can see which ads lead to orders.
        </p>

        <h3>Visit counts</h3>
        <p>
          We also count visits ourselves. For each page you open, our server records the page address, the page you
          came from, your browser type and a random visitor ID kept in your browser. We use this only to see how many
          people visit and which pages they read.
        </p>

        <h3>Your choices</h3>
        <p>
          You can block or clear cookies and site data in your browser settings, or use a content blocker; the store
          works without the Pixel. To control how Meta uses your activity for ads, use the ad preferences in your
          Facebook or Instagram account.
        </p>
      </InfoSection>

      <InfoSection id="payments-delivery" number={n("payments-delivery")} title={title("payments-delivery")}>
        <p>
          Delivery and payment providers process limited order-related information only to complete the service you
          requested.
        </p>
        <ul>
          <li>
            <strong>Payments.</strong> Online payments are processed by Razorpay. With your order we share your name,
            email address, phone number and delivery address with Razorpay. You enter your card, UPI or netbanking
            details with Razorpay; they never reach us.
          </li>
          <li>
            <strong>Delivery.</strong> Our courier partners receive your name, delivery address and phone number so
            they can deliver your order.
          </li>
          <li>
            <strong>Accounts.</strong> If you create an account, we store your name, your email address and a
            securely hashed version of your password. Your cart is kept in your own browser.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="data-protection" number={n("data-protection")} title={title("data-protection")}>
        <p>
          We take reasonable technical and administrative steps to protect customer data from unauthorized access,
          alteration or disclosure. Please keep your login and account details private on your side as well.
        </p>
      </InfoSection>

      <InfoSection id="questions" number={n("questions")} title={title("questions")}>
        <p>
          Questions about this policy or your information? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or{" "}
          <WhatsAppLink href={whatsappLink("Hi CrazyAudios, I have a question about my data.")} source="privacy_policy">
            message us on WhatsApp
          </WhatsAppLink>{" "}
          at {WHATSAPP_DISPLAY} (messages only).
        </p>
      </InfoSection>
    </InfoPageShell>
  );
}
