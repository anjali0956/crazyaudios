import type { Metadata } from "next";
import InfoPageShell from "@/app/components/InfoPageShell";
import { HelpCta } from "@/app/components/content/HelpCta";
import { SUPPORT_HOURS } from "@/app/components/chrome/links";
import { DEFAULT_OPEN_GRAPH, whatsappLink } from "@/lib/site";
import TrackYourOrderClient from "./track-your-order-client";

type SearchParams = Promise<{ receipt?: string | string[]; email?: string | string[] }>;

const DESCRIPTION = "Check the status of your CrazyAudios order with your receipt number and the email you used at checkout.";

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) || "";
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  // A link with a receipt and email filled in is personal: keep it out of search results.
  const personal = Boolean(first(params.receipt) || first(params.email));
  return {
    title: "Track your order",
    description: DESCRIPTION,
    alternates: { canonical: "/track-your-order" },
    openGraph: { ...DEFAULT_OPEN_GRAPH, url: "/track-your-order", title: "Track your CrazyAudios order", description: DESCRIPTION },
    ...(personal ? { robots: { index: false, follow: true } } : null),
  };
}

export default async function TrackYourOrderPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  return (
    <InfoPageShell
      kicker="Orders"
      title="Track your order"
      subtitle="Enter your order receipt number and the email you used at checkout to see where your order is."
    >
      <TrackYourOrderClient initialReceipt={first(params.receipt).trim()} initialEmail={first(params.email).trim()} />
      <HelpCta
        source="track_order"
        title="Need help with an order?"
        text={`No tracking number yet? Your order is most likely still being packed. For anything else, message us on WhatsApp (messages only), ${SUPPORT_HOURS}, with your receipt number.`}
        href={whatsappLink("Hi CrazyAudios, I need help tracking my order.")}
      />
    </InfoPageShell>
  );
}
