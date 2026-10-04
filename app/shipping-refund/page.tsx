import type { Metadata } from "next";
import InfoPageShell from "@/app/components/InfoPageShell";
import { FactList, type Fact } from "@/app/components/content/FactList";
import { HelpCta } from "@/app/components/content/HelpCta";
import { InfoSection } from "@/app/components/content/InfoSection";
import { sectionNumber } from "@/app/components/content/PageContents";
import { formatINR } from "@/lib/format";
import { DEFAULT_OPEN_GRAPH, whatsappLink } from "@/lib/site";
import { COD_ENABLED, COD_MAX_ORDER_VALUE, FREE_SHIPPING_THRESHOLD } from "@/lib/shipping-policy";

const FREE_FROM = formatINR(FREE_SHIPPING_THRESHOLD);
const COD_LIMIT = formatINR(COD_MAX_ORDER_VALUE);

const DESCRIPTION =
  "Shipping at the live courier rate for your PIN code" +
  (FREE_SHIPPING_THRESHOLD > 0 ? `, free on orders of ${FREE_FROM} or more` : "") +
  (COD_ENABLED ? `, Cash on Delivery up to ${COD_LIMIT}` : "") +
  ". How packaging and refunds work at CrazyAudios.";

export const metadata: Metadata = {
  title: "Shipping & refund policy",
  description: DESCRIPTION,
  alternates: { canonical: "/shipping-refund" },
  openGraph: { ...DEFAULT_OPEN_GRAPH, url: "/shipping-refund", title: "Shipping & refund policy", description: DESCRIPTION },
};

const SECTIONS = [
  { id: "dispatch", label: "Shipping window" },
  { id: "shipping-charges", label: "Shipping charges" },
  ...(COD_ENABLED ? [{ id: "cash-on-delivery", label: "Cash on Delivery" }] : []),
  { id: "packaging", label: "Packaging and handling" },
  { id: "refund-eligibility", label: "Refund eligibility" },
  { id: "refund-requests", label: "Requesting a refund" },
];

const n = (id: string) => sectionNumber(SECTIONS.findIndex((section) => section.id === id));
const label = (id: string) => SECTIONS.find((section) => section.id === id)?.label ?? "";

// Restyled and restructured only: the policy substance is unchanged.
export default function ShippingRefundPage() {
  const facts: Fact[] = [
    { label: "Shipping charge", value: "Live courier rate for your PIN code, shown at checkout before you pay" },
    ...(FREE_SHIPPING_THRESHOLD > 0
      ? [{ label: "Free shipping", value: `Products total of ${FREE_FROM} or more (incl. GST), standard courier` }]
      : []),
    ...(COD_ENABLED
      ? [{ label: "Cash on Delivery", value: `Orders up to ${COD_LIMIT}; the courier's COD charge is shown at checkout` }]
      : []),
    { label: "Refunds", value: "Considered for incorrect items, transit damage or verified defects" },
  ];

  return (
    <InfoPageShell
      kicker="Policies"
      title="Shipping & refund policy"
      subtitle="Shipping timelines, packaging expectations and refund guidelines."
      contents={SECTIONS}
    >
      <FactList title="At a glance" facts={facts} />

      <InfoSection id="dispatch" number={n("dispatch")} title={label("dispatch")}>
        <p>
          Orders are usually processed during business hours, Monday to Saturday. Dispatch timing may vary depending
          on stock verification, courier availability and delivery location.
        </p>
      </InfoSection>

      <InfoSection id="shipping-charges" number={n("shipping-charges")} title={label("shipping-charges")}>
        <p>Shipping is charged at the live courier rate for your PIN code, shown at checkout before you pay.</p>
        {FREE_SHIPPING_THRESHOLD > 0 ? (
          <p>
            Orders with a products total of <strong>{FREE_FROM} or more</strong> (incl. GST) ship free with our
            standard courier. If you pick a faster courier, you pay only the difference.
          </p>
        ) : null}
      </InfoSection>

      {COD_ENABLED ? (
        <InfoSection id="cash-on-delivery" number={n("cash-on-delivery")} title={label("cash-on-delivery")}>
          <p>
            Cash on Delivery is available on orders up to <strong>{COD_LIMIT}</strong>. The courier&apos;s COD charge
            is added to the shipping fee and shown at checkout. Please pay the delivery agent in cash when your
            parcel arrives.
          </p>
        </InfoSection>
      ) : null}

      <InfoSection id="packaging" number={n("packaging")} title={label("packaging")}>
        <p>
          We pack audio components and electronics carefully to reduce transit damage. Please inspect the package at
          delivery and contact us promptly if there is visible damage.
        </p>
      </InfoSection>

      <InfoSection id="refund-eligibility" number={n("refund-eligibility")} title={label("refund-eligibility")}>
        <p>Refunds may be considered for:</p>
        <ul>
          <li>incorrect items,</li>
          <li>products damaged in transit, or</li>
          <li>verified defects reported within a reasonable time after delivery.</li>
        </ul>
        <p>Approval depends on product condition and issue verification.</p>
      </InfoSection>

      <InfoSection id="refund-requests" number={n("refund-requests")} title={label("refund-requests")}>
        <p>When you contact support about a refund, please include:</p>
        <ul>
          <li>your order details (the receipt number starts with CA-),</li>
          <li>the product name, and</li>
          <li>clear photos or a short explanation of the issue.</li>
        </ul>
        <p>This helps us resolve the request much faster.</p>
      </InfoSection>

      <HelpCta
        source="shipping_refund"
        title="Questions about an order?"
        href={whatsappLink("Hi CrazyAudios, I have a question about my order.")}
      />
    </InfoPageShell>
  );
}
