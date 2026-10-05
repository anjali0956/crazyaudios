import Link from "next/link";
import type { ComponentType } from "react";
import { WHY_GENUINE_HREF } from "@/app/components/chrome/links";
import { IconArrowRight, IconCash, IconReceipt, IconShield, IconTruck, type IconProps } from "@/app/components/icons";
import { ButtonLink } from "@/app/components/ui/Button";
import { ProductImage } from "@/app/components/ui/ProductImage";
import { formatINR } from "@/lib/format";
import { COD_ENABLED, COD_MAX_ORDER_VALUE } from "@/lib/shipping-policy";
import type { CatalogProduct } from "@/lib/catalog";
import { DesktopOnly } from "./DesktopOnly";

// Spec §11.2 / §14 (final): the owner's headline, verbatim, and the scoped sub.
export const HERO_TITLE = "Original parts, directly imported.";
export const HERO_SUB =
  "Amplifier ICs, transistors, op-amps, MOSFETs and capacitors, directly imported from authorised international sources. Prices include GST, and most orders ship the same day.";

type TrustItem = { icon: ComponentType<IconProps>; label: string; detail: string };

const TRUST: TrustItem[] = [
  { icon: IconShield, label: "Directly imported", detail: "Every batch checked" },
  { icon: IconReceipt, label: "Invoice with GST", detail: "With every order" },
  { icon: IconTruck, label: "Same-day dispatch", detail: "Mon–Sat before 2 PM, most orders" },
  COD_ENABLED
    ? { icon: IconCash, label: `COD up to ${formatINR(COD_MAX_ORDER_VALUE)}`, detail: "Or UPI, cards, netbanking" }
    : { icon: IconCash, label: "Secure payment", detail: "UPI, cards, netbanking" },
];

// A barely-there datasheet grid behind the hero copy, fading out downwards.
const TEXTURE = {
  backgroundImage:
    "linear-gradient(rgb(255 255 255 / 0.045) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.045) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
  backgroundPosition: "-1px -1px",
  maskImage: "linear-gradient(180deg, black 20%, transparent 85%)",
  WebkitMaskImage: "linear-gradient(180deg, black 20%, transparent 85%)",
} as const;

/**
 * Desktop only: four real parts, each linking to its page. Square tiles in a
 * square grid, so the reserved space (aspect-square) matches exactly.
 */
function Specimens({ products }: { products: CatalogProduct[] }) {
  return (
    <ul role="list" aria-label="Popular originals" className="grid h-full grid-cols-2 grid-rows-2 gap-3">
      {products.map((product) => (
        <li key={product._id} className="min-h-0">
          <Link
            href={product.href}
            className="group flex h-full flex-col rounded-card bg-card p-3 text-ink transition-shadow duration-150 hover:shadow-[0_0_0_2px_var(--color-signal)] xl:p-4"
          >
            <span className="relative block min-h-0 flex-1">
              {/* Above the fold on desktop: eager, preloaded, fetchpriority="high" (ProductImage adds it for priority). */}
              <ProductImage src={product.image} alt={product.displayName} fill sizes="200px" priority className="object-contain" />
            </span>
            <span className="mt-2 flex items-baseline justify-between gap-2 border-t border-line pt-2">
              <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.02em] text-ink">{product.displayName}</span>
              <span className="text-[13px] font-semibold text-ink tabular">{formatINR(product.sellPrice)}</span>
            </span>
            {product.descriptor ? <span className="mt-0.5 truncate text-[12px] leading-4 text-muted">{product.descriptor}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Home hero (spec §11/§14): the owner's headline, the scoped sub, two
 * component CTAs, the price question link and four trust facts. Ink panel,
 * full-bleed on phones and a rounded panel inside the container on desktop.
 * Text only on phones, so the first paint is the message (fast LCP); desktop
 * adds four real parts on the right.
 */
export function HomeHero({ specimens }: { specimens: CatalogProduct[] }) {
  return (
    <section aria-labelledby="home-title" className="lg:mx-auto lg:max-w-[1200px] lg:px-8 lg:pt-6">
      <div className="on-dark relative isolate overflow-hidden bg-ink text-white lg:rounded-sheet">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={TEXTURE} />
        <div className="px-4 pb-7 pt-8 sm:px-6 sm:pt-10 lg:grid lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-12 lg:pb-12 lg:pt-14">
          <div className="lg:col-span-7">
            <p className="type-kicker text-signal">For builders &amp; repair benches</p>
            <h1 id="home-title" className="type-display mt-3 text-white max-[379px]:text-[31px] max-[379px]:leading-[35px]">
              Original parts, <span className="text-signal">directly imported.</span>
            </h1>
            <p className="mt-4 max-w-[58ch] text-[16px] leading-[25px] text-white/75 lg:mt-5 lg:text-[18px] lg:leading-7">{HERO_SUB}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/category/amplifier-ics" size="lg" className="sm:min-w-[200px]">
                Shop amplifier ICs
              </ButtonLink>
              <ButtonLink href="/category/transistors" size="lg" variant="outline-on-dark" className="sm:min-w-[180px]">
                Shop transistors
              </ButtonLink>
            </div>
            <Link
              href={WHY_GENUINE_HREF}
              prefetch={false}
              className="group mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-chip text-[15px] font-semibold text-white underline decoration-white/35 underline-offset-[5px] transition-colors hover:decoration-signal"
            >
              Why is our price higher?
              <IconArrowRight size={16} className="text-signal transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
          {specimens.length === 4 ? (
            // Rendered after hydration on desktop only, into a reserved square (no layout shift).
            <div className="hidden lg:col-span-5 lg:block">
              <div className="aspect-square">
                <DesktopOnly>
                  <Specimens products={specimens} />
                </DesktopOnly>
              </div>
            </div>
          ) : null}
        </div>

        <ul
          role="list"
          aria-label="Why buy from CrazyAudios"
          className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/10 px-4 py-5 sm:px-6 lg:grid-cols-4 lg:gap-x-8 lg:px-12 lg:py-6"
        >
          {TRUST.map(({ icon: Icon, label, detail }) => (
            <li key={label} className="flex min-w-0 items-start gap-2.5">
              <Icon size={20} className="mt-px shrink-0 text-signal" />
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold leading-5 text-white">{label}</span>
                <span className="mt-0.5 block text-[13px] leading-[18px] text-white/60">{detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
