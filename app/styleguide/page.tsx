import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import * as Icons from "@/app/components/icons";
import { Badge, PartChip } from "@/app/components/ui/Badge";
import { Breadcrumbs } from "@/app/components/ui/Breadcrumbs";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { Checkbox, Input, Select, Textarea } from "@/app/components/ui/Field";
import { CountBadge, IconButton } from "@/app/components/ui/IconButton";
import { Logo, LogoIcon, LogoMark } from "@/app/components/ui/Logo";
import { Price } from "@/app/components/ui/Price";
import { ProductCard } from "@/app/components/ui/ProductCard";
import { ProductGrid, ProductRail } from "@/app/components/ui/ProductGrid";
import { SectionHeader } from "@/app/components/ui/SectionHeader";
import { ProductCardSkeleton, ProductGridSkeleton, SkeletonText } from "@/app/components/ui/Skeleton";
import { StockStatus } from "@/app/components/ui/StockStatus";
import {
  complementOf,
  getAllProducts,
  getCategoriesWithCounts,
  getFeatured,
  partNumbersOf,
  trustLine,
  type CatalogProduct,
} from "@/lib/catalog";
import { formatINR } from "@/lib/format";
import { StyleguideDemos } from "./StyleguideDemos";

// Internal reference page for page agents: every component, rendered with
// real catalogue products. Hidden in production unless ENABLE_STYLEGUIDE=1.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
};

const COLORS: Array<{ token: string; hex: string; use: string; dark?: boolean }> = [
  { token: "ink", hex: "#121416", use: "Text, header, footer, hero", dark: true },
  { token: "ink-2", hex: "#3A3F47", use: "Secondary text", dark: true },
  { token: "muted", hex: "#6A707A", use: "Captions (AA on paper/white)", dark: true },
  { token: "paper", hex: "#F7F5F0", use: "Page background" },
  { token: "card", hex: "#FFFFFF", use: "Cards, inputs, sheets" },
  { token: "line", hex: "#E5E1D8", use: "Hairlines" },
  { token: "line-strong", hex: "#CFC9BC", use: "Input + outline borders" },
  { token: "signal", hex: "#FF5A1F", use: "Primary CTA (ink text), badge" },
  { token: "signal-soft", hex: "#FFE8DC", use: "Tinted backgrounds" },
  { token: "signal-ink", hex: "#C2410C", use: "Orange text, focus ring", dark: true },
  { token: "ok", hex: "#0E7A4E", use: "In stock, success", dark: true },
  { token: "ok-soft", hex: "#E3F3EA", use: "Discount chip" },
  { token: "warn", hex: "#B45309", use: "Low stock", dark: true },
  { token: "warn-soft", hex: "#FDF1DF", use: "Caution backgrounds" },
  { token: "danger", hex: "#B42318", use: "Errors, out of stock", dark: true },
  { token: "danger-soft", hex: "#FDECEA", use: "Error backgrounds" },
  { token: "night", hex: "#0D0F11", use: "Footer bottom bar", dark: true },
];

const SECTIONS = [
  ["colours", "Colour"],
  ["type", "Type"],
  ["logo", "Logo"],
  ["icons", "Icons"],
  ["buttons", "Buttons"],
  ["fields", "Fields"],
  ["price", "Price & stock"],
  ["chips", "Chips & badges"],
  ["cards", "Product cards"],
  ["grid", "Grid & rail"],
  ["navigation", "Headers & crumbs"],
  ["interactive", "Toasts, sheets, cart"],
  ["states", "Loading & empty"],
] as const;

function Section({ id, title, kicker, children }: { id: string; title: string; kicker: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-line pt-10">
      <p className="type-kicker text-signal-ink">{kicker}</p>
      <h2 id={`${id}-title`} className="type-h2 mt-1.5 text-ink">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="font-mono text-[12px] text-muted">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function pick(products: CatalogProduct[], test: (product: CatalogProduct) => boolean, fallback?: CatalogProduct) {
  return products.find(test) ?? fallback ?? products[0];
}

export default async function StyleguidePage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();

  const [all, featured, departments] = await Promise.all([getAllProducts(), getFeatured(), getCategoriesWithCounts()]);
  if (!all.length) notFound();

  const sale = pick(all, (p) => p.onSale && p.stock > 0);
  const pack = pick(all, (p) => p.minQty > 1);
  const low = pick(all, (p) => p.stock > 0 && p.stock <= 5 && !p.onSale, sale);
  const out = pick(all, (p) => p.stock <= 0);
  const transistor = pick(all, (p) => p.descriptor !== null && p.category === "transistor" && p.stock > 5);
  const complement = complementOf(transistor, all);
  const peerless = pick(all, (p) => p.categoryGroup === "speaker-drivers" && p.stock > 5);
  const related = all.filter((p) => p.category === transistor.category && p._id !== transistor._id).slice(0, 8);
  const toCart = (p: CatalogProduct) => ({
    _id: p._id,
    name: p.name,
    price: p.price,
    image: p.image,
    stock: p.stock,
    packSize: p.packSize,
    flashSale: p.flashSale,
    discountPercentage: p.discountPercentage,
    category: p.category,
  });

  return (
    <main className="page-wrap flex-1 pb-20 pt-8 lg:pt-12">
      <header className="max-w-[720px]">
        <p className="type-kicker text-signal-ink">Design system · Datasheet Bench</p>
        <h1 className="type-display mt-2 text-ink">CrazyAudios foundation</h1>
        <p className="mt-4 text-[17px] leading-[26px] text-ink-2">
          Tokens, type and components every storefront page is built from, shown with live catalogue data ({all.length} products in{" "}
          {departments.reduce((sum, group) => sum + group.categories.length, 0)} categories). Import paths and props are in FOUNDATION_API.md.
        </p>
      </header>

      <nav aria-label="Style guide sections" className="mt-8">
        <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {SECTIONS.map(([id, label]) => (
            <li key={id} className="shrink-0">
              <a
                href={`#${id}`}
                className="inline-flex h-10 items-center rounded-full border border-line-strong bg-card px-3.5 text-[14px] font-medium text-ink-2 hover:border-ink hover:text-ink"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 grid grid-cols-1 gap-14">
        <Section id="colours" kicker="Tokens" title="Colour">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {COLORS.map((color) => (
              <li key={color.token} className="overflow-hidden rounded-card border border-line bg-card">
                <div className="h-16 border-b border-line" style={{ background: color.hex }} />
                <div className="p-3">
                  <p className="font-mono text-[13px] font-semibold text-ink">{color.token}</p>
                  <p className="font-mono text-[12px] text-muted">{color.hex}</p>
                  <p className="mt-1 text-[12px] leading-4 text-ink-2">{color.use}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-line bg-card p-4">
              <p className="font-mono text-[12px] text-muted">radius</p>
              <div className="mt-3 flex items-end gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-chip border border-line-strong font-mono text-[11px]">6</span>
                <span className="grid h-12 w-12 place-items-center rounded-card border border-line-strong font-mono text-[11px]">10</span>
                <span className="grid h-12 w-12 place-items-center rounded-sheet border border-line-strong font-mono text-[11px]">16</span>
                <span className="grid h-12 w-12 place-items-center rounded-full border border-line-strong font-mono text-[11px]">full</span>
              </div>
            </div>
            <div className="rounded-card border border-line bg-card p-4">
              <p className="font-mono text-[12px] text-muted">shadow-raised (sheets, toasts, bars only)</p>
              <div className="mt-3 h-12 rounded-card bg-card shadow-raised" />
            </div>
            <div className="rounded-card border border-line bg-card p-4">
              <p className="font-mono text-[12px] text-muted">focus (Tab to see)</p>
              <div className="mt-3 flex gap-3">
                <Button variant="outline" size="sm">
                  Focus me
                </Button>
                <span className="on-dark inline-flex rounded-card bg-ink p-1">
                  <Button variant="ghost-on-dark" size="sm">
                    On dark
                  </Button>
                </span>
              </div>
            </div>
          </div>
        </Section>

        <Section id="type" kicker="Archivo + IBM Plex Mono" title="Type">
          <div className="grid gap-6 rounded-card border border-line bg-card p-5 lg:p-8">
            <Spec label="type-display · 34/38 → 52/56 · 800 · 118%">
              <p className="type-display">Original parts, directly imported.</p>
            </Spec>
            <Spec label="type-h1 · 26/31 → 38/42 · 800 · 118%">
              <p className="type-h1">{transistor.displayName} {transistor.descriptor}</p>
            </Spec>
            <Spec label="type-h2 · 21/26 → 28/32 · 750 · 112%">
              <p className="type-h2">Builder favourites</p>
            </Spec>
            <Spec label="type-h3 · 17/23 · 750 · 112%">
              <p className="type-h3">Key specs</p>
            </Spec>
            <Spec label="type-body · 16/24">
              <p className="type-body max-w-[62ch] text-ink-2">{(transistor.description.slice(1, 3).length ? transistor.description.slice(1, 3) : transistor.description).join(". ")}.</p>
            </Spec>
            <Spec label="type-small · 14/20 · type-micro · 12/16">
              <p className="type-small text-ink-2">Ships today if ordered before 2 PM (Mon–Sat)</p>
              <p className="type-micro mt-1 text-muted">Incl. GST</p>
            </Spec>
            <Spec label="type-kicker · Plex Mono 12 · .12em · uppercase">
              <p className="type-kicker text-signal-ink">{trustLine(transistor.category)}</p>
            </Spec>
            <Spec label="font-mono · part numbers, spec values">
              <p className="font-mono text-[15px] text-ink">
                {partNumbersOf(transistor).join(" · ") || transistor.displayName} · TO-3P · ±20–42 V
              </p>
            </Spec>
            <Spec label="type-price · 700 · tabular">
              <p className="type-price text-[30px] leading-9">{formatINR(sale.displayPrice)}</p>
            </Spec>
          </div>
        </Section>

        <Section id="logo" kicker="Brand" title="Logo">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="on-dark grid min-h-36 place-items-center rounded-sheet bg-ink p-8">
              <Logo variant="on-dark" className="h-8" />
            </div>
            <div className="grid min-h-36 place-items-center rounded-sheet border border-line bg-card p-8">
              <Logo variant="on-light" className="h-8" />
            </div>
            <div className="flex min-h-28 items-center justify-center gap-8 rounded-sheet border border-line bg-paper p-6">
              <LogoMark className="h-10 text-ink" />
              <span className="rounded-card bg-ink p-3 text-white">
                <LogoMark className="h-8" />
              </span>
            </div>
            <div className="flex min-h-28 items-center justify-center gap-6 rounded-sheet border border-line bg-paper p-6">
              <LogoIcon className="h-16 w-16" />
              <LogoIcon className="h-10 w-10" />
              <LogoIcon className="h-6 w-6" />
              <LogoIcon className="h-4 w-4" />
            </div>
          </div>
        </Section>

        <Section id="icons" kicker="24px grid · 1.75 stroke" title="Icons">
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-9">
            {Object.entries(Icons)
              .filter(([name]) => name.startsWith("Icon"))
              .map(([name, Icon]) => {
                const Component = Icon as (props: Icons.IconProps) => ReactNode;
                return (
                  <li key={name} className="flex flex-col items-center gap-2 rounded-card border border-line bg-card px-1 py-3">
                    <Component size={24} className={name === "IconWhatsApp" ? "text-whatsapp" : "text-ink"} />
                    <span className="max-w-full truncate font-mono text-[10px] text-muted">{name.replace("Icon", "")}</span>
                  </li>
                );
              })}
          </ul>
        </Section>

        <Section id="buttons" kicker="Never inside a link" title="Buttons">
          <div className="grid gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" icon={<Icons.IconBag size={20} />}>
                Add to cart
              </Button>
              <Button variant="dark">Check</Button>
              <Button variant="outline">Add to cart</Button>
              <Button variant="ghost">View all</Button>
              <Button variant="primary" loading loadingText="Placing order…">
                Place COD order
              </Button>
              <Button variant="primary" disabled>
                Out of stock
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Button size="sm" variant="outline">
                Small 40
              </Button>
              <Button size="md">Medium 44</Button>
              <Button size="lg">Large 52</Button>
              <ButtonLink href="/category/amplifier-ics" variant="outline" iconRight={<Icons.IconArrowRight size={18} />}>
                ButtonLink
              </ButtonLink>
            </div>
            <div className="on-dark flex flex-wrap items-center gap-3 rounded-sheet bg-ink p-5">
              <Button variant="primary">Shop amplifier ICs</Button>
              <Button variant="outline-on-dark">Shop transistors</Button>
              <Button variant="ghost-on-dark">Ghost on dark</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <IconButton label="Open menu">
                <Icons.IconMenu />
              </IconButton>
              <IconButton label="Search" variant="outline">
                <Icons.IconSearch />
              </IconButton>
              <span className="on-dark inline-flex gap-1 rounded-card bg-ink p-1">
                <IconButton label="Search" variant="ghost-on-dark">
                  <Icons.IconSearch />
                </IconButton>
                <IconButton label="Cart, 3 items" variant="ghost-on-dark" badge={<CountBadge count={3} />}>
                  <Icons.IconBag />
                </IconButton>
              </span>
              <Button variant="outline" className="w-full sm:w-auto" icon={<Icons.IconWhatsApp size={20} className="text-whatsapp" />}>
                Ask about this part on WhatsApp
              </Button>
            </div>
          </div>
        </Section>

        <Section id="fields" kicker="48px · visible labels" title="Fields">
          <div className="grid gap-5 rounded-card border border-line bg-card p-5 sm:grid-cols-2 lg:p-8">
            <Input label="Mobile number" name="sg-phone" type="tel" inputMode="numeric" autoComplete="tel-national" prefix="+91" placeholder="98470 12345" />
            <Input label="Email" name="sg-email" type="email" autoComplete="email" hint="For your invoice and tracking" placeholder="you@example.com" />
            <Input label="PIN code" name="sg-pin" inputMode="numeric" defaultValue="68200" error="Enter a 6-digit PIN code" />
            <Input label="Landmark" name="sg-landmark" optional placeholder="Near the bus stand" />
            <Select label="State" name="sg-state" defaultValue="" placeholder="Choose your state">
              <option>Kerala</option>
              <option>Karnataka</option>
              <option>Tamil Nadu</option>
            </Select>
            <Select label="State (error)" name="sg-state-2" defaultValue="" placeholder="Choose your state" error="Select a state">
              <option>Kerala</option>
            </Select>
            <Textarea label="Order note" name="sg-note" optional hint="Anything we should know about delivery" className="sm:col-span-2" />
            <Checkbox label="Billing address same as delivery" defaultChecked />
            <Input label="Disabled" name="sg-disabled" disabled defaultValue="Irinjalakuda" />
          </div>
        </Section>

        <Section id="price" kicker="getDisplayPrice · whole rupees" title="Price & stock">
          <div className="grid gap-5 rounded-card border border-line bg-card p-5 sm:grid-cols-2 lg:grid-cols-3 lg:p-8">
            <Spec label={`lg · flash sale · ${sale.displayName}`}>
              <Price size="lg" price={sale.sellPrice} mrp={sale.sellMrp} taxNote="Incl. GST · free shipping over ₹1,499" />
            </Spec>
            <Spec label={`md · ${transistor.displayName}`}>
              <Price size="md" price={transistor.sellPrice} mrp={transistor.sellMrp} />
            </Spec>
            <Spec label={`sm · pack · ${pack.displayName}`}>
              <Price size="sm" price={pack.sellPrice} mrp={pack.sellMrp} unit={`pack of ${pack.minQty}`} />
              <p className="mt-1 font-mono text-[12px] text-muted">unit {formatINR(pack.displayPrice)}</p>
            </Spec>
            <Spec label={`in stock · ${transistor.stock}`}>
              <StockStatus stock={transistor.stock} suffix="Ships today" />
            </Spec>
            <Spec label={`low · ${low.stock}`}>
              <StockStatus stock={low.stock} />
            </Spec>
            <Spec label="out">
              <StockStatus stock={out.stock} />
            </Spec>
            <Spec label={`compact · pack of ${pack.minQty}`}>
              <StockStatus stock={pack.stock} packSize={pack.packSize} compact />
              <StockStatus stock={pack.minQty * 3} packSize={pack.packSize} compact className="mt-1" />
            </Spec>
          </div>
        </Section>

        <Section id="chips" kicker="Mono labels" title="Chips & badges">
          <div className="flex flex-wrap items-center gap-2">
            {partNumbersOf(transistor).map((part) => (
              <PartChip key={part}>{part}</PartChip>
            ))}
            <PartChip>TO-220</PartChip>
            <PartChip>±20–42 V</PartChip>
            <Badge tone="signal">Sale −10%</Badge>
            <Badge tone="ok" icon={<Icons.IconCheck size={12} strokeWidth={3} />}>
              CA Certified
            </Badge>
            <Badge tone="neutral">New</Badge>
            <Badge tone="warn">Prepaid only</Badge>
            <Badge tone="danger">Out of stock</Badge>
          </div>
        </Section>

        <Section id="cards" kicker="Real products" title="Product cards">
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:gap-5 wide:grid-cols-4">
            {[sale, transistor, pack, out, low, peerless, complement ?? featured[0]].filter(Boolean).map((product, index) => (
              <li key={`${product!._id}-${index}`}>
                <ProductCard product={product!} priority={index < 2} />
              </li>
            ))}
            <li>
              <ProductCardSkeleton />
            </li>
          </ul>
          <p className="mt-3 text-[13px] text-muted">
            Sale · descriptor + complement ({transistor.displayName} ↔ {complement?.displayName ?? "none"}) · pack price · out of stock (View) · low stock ·
            Peerless (brand dropped from the title) · skeleton.
          </p>
        </Section>

        <Section id="grid" kicker="2 → 3 → 4 columns" title="Grid & rail">
          <SectionHeader kicker="Featured" title="Builder favourites" href="/category/amplifier-ics" linkLabel="View all" />
          <ProductGrid products={featured.slice(0, 8)} className="mt-5" />
          <SectionHeader kicker="Same family" title="Related products" className="mt-12" />
          <ProductRail products={related} label="Related products" className="mt-5" />
        </Section>

        <Section id="navigation" kicker="Wayfinding" title="Headers & crumbs">
          <div className="grid gap-6">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: transistor.categoryLabel, href: `/category/${transistor.categorySlug}` },
                { label: transistor.displayName },
              ]}
            />
            <SectionHeader kicker="Shop by department" title="What are you building?" description="Components lead; speaker drivers come last." />
            <div className="on-dark rounded-sheet bg-ink p-5">
              <SectionHeader tone="dark" kicker="Peerless by Tymphany" title="Speaker drivers" href="/category/speaker-drivers" />
            </div>
          </div>
        </Section>

        <Section id="interactive" kicker="Client islands" title="Toasts, sheets, cart">
          <StyleguideDemos product={toCart(transistor)} packProduct={toCart(pack)} />
        </Section>

        <Section id="states" kicker="Never “Loading…”" title="Loading & empty">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-card border border-line bg-card p-5">
              <SkeletonText lines={4} />
              <ProductGridSkeleton count={2} className="mt-5" />
            </div>
            <div className="rounded-card border border-line bg-card">
              <EmptyState
                icon={<Icons.IconBag size={26} />}
                title="Your cart is empty"
                description="Parts you add show up here. Most orders ship the same day."
                action={
                  <>
                    <ButtonLink href="/category/amplifier-ics">Shop amplifier ICs</ButtonLink>
                    <ButtonLink href="/category/transistors" variant="outline">
                      Shop transistors
                    </ButtonLink>
                  </>
                }
              />
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}
