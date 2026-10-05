import type { Metadata } from "next";
import InfoPageShell from "@/app/components/InfoPageShell";
import { InfoSection } from "@/app/components/content/InfoSection";
import { LinkRows } from "@/app/components/content/LinkRows";
import { sectionNumber } from "@/app/components/content/PageContents";
import { DEFAULT_OPEN_GRAPH } from "@/lib/site";

const DESCRIPTION = "The general terms that apply to browsing, ordering from and using CrazyAudios.";

export const metadata: Metadata = {
  title: "Terms of service",
  description: DESCRIPTION,
  alternates: { canonical: "/terms-of-service" },
  openGraph: { ...DEFAULT_OPEN_GRAPH, url: "/terms-of-service", title: "CrazyAudios terms of service", description: DESCRIPTION },
};

const SECTIONS = [
  { id: "product-information", label: "Product information" },
  { id: "orders-availability", label: "Orders and availability" },
  { id: "customer-responsibilities", label: "Customer responsibilities" },
  { id: "changes", label: "Changes to these terms" },
];

export default function TermsOfServicePage() {
  return (
    <InfoPageShell
      kicker="Policies"
      title="Terms of service"
      subtitle="General terms that apply to browsing, ordering and using CrazyAudios."
    >
      <InfoSection id="product-information" number={sectionNumber(0)} title={SECTIONS[0].label}>
        <p>
          We aim to keep product descriptions, pricing, availability and images accurate. Small differences in
          packaging, manufacturing batch or finish may occur.
        </p>
      </InfoSection>

      <InfoSection id="orders-availability" number={sectionNumber(1)} title={SECTIONS[1].label}>
        <p>
          Orders are subject to stock confirmation. In the unusual case that an item becomes unavailable after
          purchase, our team will contact you to offer an update, a replacement or a refund.
        </p>
      </InfoSection>

      <InfoSection id="customer-responsibilities" number={sectionNumber(2)} title={SECTIONS[2].label}>
        <p>Customers are responsible for:</p>
        <ul>
          <li>providing correct shipping information, and</li>
          <li>making sure the components they buy suit their application, voltage and system design.</li>
        </ul>
      </InfoSection>

      <InfoSection id="changes" number={sectionNumber(3)} title={SECTIONS[3].label}>
        <p>
          These terms may be updated as the store evolves. Continued use of the website means you accept the latest
          posted version.
        </p>
      </InfoSection>

      <LinkRows
        label="Related policies"
        links={[
          { href: "/shipping-refund", label: "Shipping & refund policy", description: "Charges, Cash on Delivery and refunds" },
          { href: "/privacy-policy", label: "Privacy policy", description: "What we collect and why" },
        ]}
      />
    </InfoPageShell>
  );
}
