import Link from "next/link";
import { IconClock, IconMail, IconWhatsApp } from "@/app/components/icons";
import { Logo } from "@/app/components/ui/Logo";
import {
  COMPANY_LINKS,
  CORE_MESSAGE,
  HELP_LINKS,
  LEGAL_LINKS,
  PAYMENT_METHODS,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  WHATSAPP_DISPLAY,
  WHATSAPP_HELP_URL,
  type NavLink,
} from "./links";
import { WhatsAppLink } from "./TrackedLink";

// Owner's department order (spec §11): components first, speakers last.
const SHOP_LINKS: NavLink[] = [
  { label: "Amplifier ICs", href: "/category/amplifier-ics" },
  { label: "Transistors", href: "/category/transistors" },
  { label: "Op-amps", href: "/category/op-amps" },
  { label: "MOSFETs", href: "/category/mosfets" },
  { label: "Capacitors", href: "/category/capacitors" },
  { label: "BrainsAudios modules", href: "/category/brainsaudios" },
  { label: "Speaker drivers", href: "/category/speaker-drivers" },
];

// Evaluated once per build/revalidation, not during render.
const YEAR = new Date().getFullYear();

function FooterColumn({ id, title, links }: { id: string; title: string; links: NavLink[] }) {
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className="type-kicker text-white/55">
        {title}
      </h2>
      <ul className="mt-3">
        {links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a href={link.href} className="flex min-h-11 items-center text-[15px] text-white/75 transition-colors hover:text-white lg:min-h-9">
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="flex min-h-11 items-center text-[15px] text-white/75 transition-colors hover:text-white lg:min-h-9">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Global footer (every page): brand, contact, link columns, payments, legal. */
export function Footer() {
  return (
    // content-visibility: the browser skips style and layout of the footer
    // until it nears the viewport (it is far below the fold on every page),
    // including the re-layout when the web font swaps in. The intrinsic size
    // is its real height, so the scrollbar barely moves when it renders.
    <footer className="on-dark mt-auto bg-ink text-white [content-visibility:auto] [contain-intrinsic-size:auto_1250px] lg:[contain-intrinsic-size:auto_600px]">
      <div className="page-wrap pb-10 pt-12 lg:pb-12 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5 lg:pr-10">
            <Link href="/" aria-label="CrazyAudios home" className="inline-flex min-h-11 items-center rounded-chip">
              <Logo variant="on-dark" decorative className="h-[22px]" />
            </Link>
            <p className="mt-4 text-[21px] font-extrabold leading-[26px] tracking-[-0.01em] text-white [font-stretch:112%]">
              {CORE_MESSAGE}.
            </p>
            <p className="mt-2 max-w-[44ch] text-[15px] leading-[22px] text-white/70">
              Amplifier ICs, transistors, op-amps, capacitors and Peerless speaker drivers for builders and repair benches across India.
            </p>

            <ul className="mt-6 space-y-1 text-[15px]">
              <li>
                <WhatsAppLink
                  href={WHATSAPP_HELP_URL}
                  source="footer"
                  className="inline-flex min-h-11 items-center gap-3 text-white transition-colors hover:text-signal"
                >
                  <IconWhatsApp size={20} className="text-whatsapp" />
                  <span>
                    WhatsApp {WHATSAPP_DISPLAY}
                    <span className="text-white/60"> · messages only</span>
                  </span>
                </WhatsAppLink>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex min-h-11 items-center gap-3 text-white transition-colors hover:text-signal"
                >
                  <IconMail size={20} className="text-white/70" />
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li className="flex min-h-11 items-center gap-3 text-white/70">
                <IconClock size={20} />
                {SUPPORT_HOURS}
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-7">
            <FooterColumn id="footer-shop" title="Shop" links={SHOP_LINKS} />
            <FooterColumn id="footer-help" title="Help" links={HELP_LINKS} />
            <FooterColumn id="footer-company" title="Company" links={COMPANY_LINKS} />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-[14px] leading-5 text-white/70 lg:flex-row lg:items-center lg:justify-between">
          <p>
            <span className="type-kicker mr-2 text-white/55">We accept</span>
            {PAYMENT_METHODS}
          </p>
          <p>Prices include GST · Invoice with every order</p>
        </div>
      </div>

      <div className="bg-night">
        <div className="page-wrap flex flex-col gap-1 py-3 text-[13px] text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p className="py-2">© {YEAR} CrazyAudios</p>
          <ul className="flex gap-5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-flex min-h-11 items-center hover:text-white sm:min-h-9">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
