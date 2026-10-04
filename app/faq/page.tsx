import type { Metadata } from "next";
import InfoPageShell from "@/app/components/InfoPageShell";
import { FaqList, faqPageJsonLd, type FaqEntry } from "@/app/components/content/FaqList";
import { InfoSection } from "@/app/components/content/InfoSection";
import { JsonLd } from "@/app/components/content/JsonLd";
import { sectionNumber } from "@/app/components/content/PageContents";
import { HelpCta } from "@/app/components/content/HelpCta";
import { SUPPORT_EMAIL, WHATSAPP_DISPLAY } from "@/app/components/chrome/links";
import { formatINR } from "@/lib/format";
import { DEFAULT_OPEN_GRAPH } from "@/lib/site";
import { COD_ENABLED, COD_MAX_ORDER_VALUE, FREE_SHIPPING_THRESHOLD } from "@/lib/shipping-policy";

const DESCRIPTION =
  "Answers about original parts, Cash on Delivery, free shipping, same-day dispatch, GST invoices and tracking your CrazyAudios order.";

export const metadata: Metadata = {
  title: "FAQ",
  description: DESCRIPTION,
  alternates: { canonical: "/faq" },
  openGraph: { ...DEFAULT_OPEN_GRAPH, url: "/faq", title: "CrazyAudios FAQ", description: DESCRIPTION },
};

const COD_LIMIT = formatINR(COD_MAX_ORDER_VALUE);
const FREE_FROM = formatINR(FREE_SHIPPING_THRESHOLD);

// Every answer uses only facts already on the site (DESIGN_SPEC §0, §14).
// Markup: [label](href); "whatsapp" is a tracked chat link.
const GROUPS: Array<{ id: string; title: string; items: FaqEntry[] }> = [
  {
    id: "genuine-parts",
    title: "Genuine parts",
    items: [
      {
        id: "original",
        question: "Do you sell original products?",
        answer:
          "Yes. Our ICs, transistors, capacitors and other components are directly imported from authorized international sources, ensuring authenticity and traceability. Speaker drivers and audio modules are procured from reputed dealers and certified importers.",
      },
      {
        id: "why-price-higher",
        question: "Why is your price higher than other listings?",
        answer:
          "Because our components are originals, directly imported. Much cheaper listings of the same part numbers are commonly counterfeits: re-marked or recycled parts that can look right but deliver less power, run hot or fail early.\n\n[Read why genuine parts cost more](/why-genuine), including how to spot a fake.",
      },
      {
        id: "ca-certified",
        question: "What does CA Certified mean?",
        answer: "It means the batch was quality-checked by us before it went on sale. We check every batch.",
      },
      {
        id: "help-choosing",
        question: "Can I ask for help choosing parts?",
        answer:
          "Yes. If you are comparing woofers, tweeters, amplifiers, tone control modules or ICs, [message us on WhatsApp](whatsapp) with your project details and we will guide you as best we can.",
      },
    ],
  },
  {
    id: "orders-payment",
    title: "Orders and payment",
    items: [
      ...(COD_ENABLED
        ? [
            {
              id: "cash-on-delivery",
              question: "Do you offer Cash on Delivery?",
              answer: `Yes, on orders up to ${COD_LIMIT}. The courier's COD charge is shown at checkout before you place the order.`,
            },
          ]
        : []),
      {
        id: "payment",
        question: "How can I pay?",
        answer: COD_ENABLED
          ? `Online by UPI, card or netbanking (processed by Razorpay), or Cash on Delivery on orders up to ${COD_LIMIT}.`
          : "Online by UPI, card or netbanking, processed by Razorpay.",
      },
      {
        id: "gst-invoice",
        question: "Do I get a GST invoice?",
        answer:
          "Yes, with every order, and our prices include GST. You can download the invoice from your order confirmation page, from [Track your order](/track-your-order), or from [My orders](/orders) if you were signed in when you ordered.",
      },
      {
        id: "account",
        question: "Do I need an account to order?",
        answer:
          "No, you can check out as a guest. If you are signed in when you order, the order also appears in [My orders](/orders).",
      },
      {
        id: "out-of-stock",
        question: "What if a product goes out of stock?",
        answer:
          "Some items return after restocking. If a part is important for your build, [message us on WhatsApp](whatsapp) and we can let you know whether a restock or an alternative is available.",
      },
    ],
  },
  {
    id: "shipping-delivery",
    title: "Shipping and delivery",
    items: [
      ...(FREE_SHIPPING_THRESHOLD > 0
        ? [
            {
              id: "free-shipping",
              question: "Is shipping free?",
              answer: `Yes, on orders with a products total of ${FREE_FROM} or more (incl. GST), using our standard courier. Smaller orders pay the live courier rate shown at checkout.`,
            },
          ]
        : []),
      {
        id: "dispatch",
        question: "When will my order ship?",
        answer:
          "Most orders placed before 2 PM, Monday to Saturday, are dispatched the same day. Delivery time then depends on your PIN code and the courier.",
      },
      {
        id: "tracking",
        question: "How do I track my order?",
        answer:
          "Open [Track your order](/track-your-order) and enter your order receipt number (it starts with CA-) and the email you used at checkout. If you were signed in when you ordered, you will also find it in [My orders](/orders).",
      },
      {
        id: "damaged",
        question: "What if my parcel arrives damaged?",
        answer:
          "Please inspect the package at delivery and contact us promptly if there is visible damage, with photos if you can. See our [shipping and refund policy](/shipping-refund) for how refunds work.",
      },
    ],
  },
  {
    id: "help-support",
    title: "Help and support",
    items: [
      {
        id: "whatsapp-hours",
        question: "When can I reach you on WhatsApp?",
        answer: `[Message us on WhatsApp](whatsapp) at ${WHATSAPP_DISPLAY} (messages only), Monday to Saturday, 9:15 AM to 6:15 PM. You can also email [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}).`,
      },
      {
        id: "after-purchase",
        question: "Do you offer support after purchase?",
        answer:
          "Yes. We provide reasonable product guidance and order support, especially for shipping, availability and basic compatibility questions.",
      },
    ],
  },
];

export default function FaqPage() {
  const allItems = GROUPS.flatMap((group) => group.items);
  return (
    <InfoPageShell
      kicker="Help"
      title="Frequently asked questions"
      subtitle="Quick answers about original parts, payment, shipping and your orders."
      contents={GROUPS.map((group) => ({ id: group.id, label: group.title }))}
    >
      <JsonLd data={faqPageJsonLd(allItems)} />
      {GROUPS.map((group, index) => (
        <InfoSection key={group.id} id={group.id} number={sectionNumber(index)} title={group.title} prose={false}>
          <FaqList items={group.items} whatsappSource="faq" />
        </InfoSection>
      ))}
      <HelpCta source="faq" title="Still have a question?" />
    </InfoPageShell>
  );
}
