import type { ComponentType, ReactNode } from "react";
import { SUPPORT_HOURS, WHATSAPP_DISPLAY, WHATSAPP_HELP_URL } from "@/app/components/chrome/links";
import { WhatsAppLink } from "@/app/components/chrome/TrackedLink";
import { IconCash, IconShield, IconTruck, IconWhatsApp, type IconProps } from "@/app/components/icons";
import { formatINR } from "@/lib/format";
import { COD_ENABLED, COD_MAX_ORDER_VALUE, FREE_SHIPPING_THRESHOLD } from "@/lib/shipping-policy";

type ServicePromise = { icon: ComponentType<IconProps>; title: string; text: ReactNode };

// Only the owner's stated facts (spec §0). Dispatch, GST and sourcing are in the hero.
const PROMISES: ServicePromise[] = [
  FREE_SHIPPING_THRESHOLD > 0
    ? { icon: IconTruck, title: "Free shipping", text: `On orders of ${formatINR(FREE_SHIPPING_THRESHOLD)} and above` }
    : { icon: IconTruck, title: "Same-day dispatch", text: "Mon–Sat before 2 PM, most orders" },
  { icon: IconShield, title: "Warranty", text: "Seller and manufacturer warranty" },
  {
    icon: IconCash,
    title: "Secure payment",
    text: COD_ENABLED ? `UPI, cards, netbanking or COD up to ${formatINR(COD_MAX_ORDER_VALUE)}` : "UPI, cards and netbanking",
  },
];

/** Compact service promises: one hairline-divided card, 2×2 on phones, 4 across on desktop. */
export function ServicePromises() {
  const cell = "flex min-w-0 flex-col gap-2 bg-card p-4 sm:flex-row sm:gap-3 lg:p-5";
  return (
    <section aria-labelledby="home-promises" className="page-wrap pb-14 pt-10 lg:pb-20 lg:pt-[72px]">
      <h2 id="home-promises" className="sr-only">
        Shopping with CrazyAudios
      </h2>
      <ul role="list" className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
        {PROMISES.map(({ icon: Icon, title, text }) => (
          <li key={title} className={cell}>
            <Icon size={22} className="shrink-0 text-signal-ink" />
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-5 text-ink">{title}</span>
              <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-2">{text}</span>
            </span>
          </li>
        ))}
        <li className="flex min-w-0 bg-card">
          <WhatsAppLink
            href={WHATSAPP_HELP_URL}
            source="home_promises"
            className="group flex w-full min-w-0 flex-col gap-2 p-4 hover:bg-paper sm:flex-row sm:gap-3 lg:p-5"
          >
            <IconWhatsApp size={22} className="shrink-0 text-whatsapp" />
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-5 text-ink underline-offset-4 group-hover:underline">
                WhatsApp support
              </span>
              <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-2">
                <span className="block whitespace-nowrap">{WHATSAPP_DISPLAY}</span>
                {/* "Mon–Sat, 9:15 AM–6:15 PM": wrap only after the comma. */}
                {SUPPORT_HOURS.split(", ").map((part, index, parts) => (
                  <span key={part} className="whitespace-nowrap">
                    {part}
                    {index < parts.length - 1 ? ", " : ""}
                  </span>
                ))}
              </span>
            </span>
          </WhatsAppLink>
        </li>
      </ul>
    </section>
  );
}
