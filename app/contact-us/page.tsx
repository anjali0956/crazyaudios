import type { Metadata } from "next";
import InfoPageShell from "@/app/components/InfoPageShell";
import { InfoSection } from "@/app/components/content/InfoSection";
import { LinkRows } from "@/app/components/content/LinkRows";
import { WhatsAppButton } from "@/app/components/content/WhatsAppButton";
import { SUPPORT_EMAIL, SUPPORT_HOURS, WHATSAPP_DISPLAY } from "@/app/components/chrome/links";
import { IconClock, IconInfo, IconMail, IconMapPin, IconPackage, IconReturn, IconWhatsApp } from "@/app/components/icons";
import { DEFAULT_OPEN_GRAPH, whatsappLink } from "@/lib/site";

const DESCRIPTION = `Message CrazyAudios on WhatsApp ${WHATSAPP_DISPLAY} (messages only) or email ${SUPPORT_EMAIL}. Support ${SUPPORT_HOURS}.`;

export const metadata: Metadata = {
  title: "Contact us",
  description: DESCRIPTION,
  alternates: { canonical: "/contact-us" },
  openGraph: { ...DEFAULT_OPEN_GRAPH, url: "/contact-us", title: "Contact CrazyAudios", description: DESCRIPTION },
};

// Same message and Meta "Contact" payload (content_category "contact_page") as
// the old WhatsAppContactLink on this page.
const CONTACT_CHAT_URL = whatsappLink("Hi CrazyAudios, I need help with an order or a part.");

export default function ContactUsPage() {
  return (
    <InfoPageShell
      kicker="Help"
      title="Contact us"
      subtitle="WhatsApp is the quickest way to reach us. Send your question any time; we reply during support hours."
    >
      <div className="space-y-4">
        <section aria-labelledby="contact-whatsapp" className="rounded-sheet border border-line bg-card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-whatsapp text-white">
              <IconWhatsApp size={26} />
            </span>
            <div className="min-w-0">
              <h2 id="contact-whatsapp" className="type-kicker text-muted">
                WhatsApp · messages only
              </h2>
              <p className="mt-1 text-[24px] font-bold leading-[30px] tracking-[-0.01em] text-ink tabular [font-stretch:112%]">
                {WHATSAPP_DISPLAY}
              </p>
              <p className="mt-1 text-[15px] leading-[22px] text-ink-2">
                For questions about a part, an order or a delivery. {SUPPORT_HOURS}.
              </p>
            </div>
          </div>
          <WhatsAppButton href={CONTACT_CHAT_URL} source="contact_page" fullWidth className="mt-5 sm:w-auto" />
        </section>

        <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
          <li className="bg-card">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex min-h-[76px] items-start gap-3 p-4 transition-colors duration-150 hover:bg-paper sm:p-5"
            >
              <IconMail size={20} className="mt-0.5 shrink-0 text-signal-ink" />
              <span className="min-w-0">
                <span className="block text-[14px] leading-5 text-muted">Email</span>
                <span className="block break-words text-[16px] font-semibold leading-6 text-ink underline decoration-line-strong underline-offset-4">
                  {SUPPORT_EMAIL}
                </span>
              </span>
            </a>
          </li>
          <li className="flex items-start gap-3 bg-card p-4 sm:p-5">
            <IconClock size={20} className="mt-0.5 shrink-0 text-signal-ink" />
            <span>
              <span className="block text-[14px] leading-5 text-muted">Support hours</span>
              <span className="block text-[16px] font-semibold leading-6 text-ink">{SUPPORT_HOURS}</span>
            </span>
          </li>
          <li className="flex items-start gap-3 bg-card p-4 sm:col-span-2 sm:p-5">
            <IconMapPin size={20} className="mt-0.5 shrink-0 text-signal-ink" />
            <span>
              <span className="block text-[14px] leading-5 text-muted">Dispatch</span>
              <span className="block text-[16px] font-semibold leading-6 text-ink">
                Ships from Irinjalakuda, Thrissur, Kerala
              </span>
            </span>
          </li>
        </ul>
      </div>

      <InfoSection id="faster-help" title="Get a faster answer">
        <p>For help with an order, please include:</p>
        <ul>
          <li>
            your order receipt number (it starts with <span className="type-mono text-[15px] text-ink">CA-</span>)
          </li>
          <li>the product name</li>
          <li>what went wrong, with a photo if you can</li>
        </ul>
        <p>That helps us reply much faster and more accurately.</p>
      </InfoSection>

      <LinkRows
        label="Help pages"
        links={[
          {
            href: "/track-your-order",
            label: "Track your order",
            description: "With your receipt number and email",
            icon: <IconPackage size={18} />,
          },
          {
            href: "/shipping-refund",
            label: "Shipping & refund",
            description: "Charges, Cash on Delivery and refunds",
            icon: <IconReturn size={18} />,
          },
          { href: "/faq", label: "FAQ", description: "Quick answers to common questions", icon: <IconInfo size={18} /> },
        ]}
      />
    </InfoPageShell>
  );
}
