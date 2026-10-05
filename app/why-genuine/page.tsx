import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { FaqList, faqPageJsonLd, type FaqEntry } from "@/app/components/content/FaqList";
import { JsonLd } from "@/app/components/content/JsonLd";
import { WhatsAppButton } from "@/app/components/content/WhatsAppButton";
import { SUPPORT_EMAIL, SUPPORT_HOURS } from "@/app/components/chrome/links";
import {
  IconAlert,
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconCheckCircle,
  IconChip,
  IconClock,
  IconClose,
  IconInfo,
  IconReceipt,
  IconRefresh,
  IconShield,
  IconWhatsApp,
} from "@/app/components/icons";
import { ButtonLink } from "@/app/components/ui/Button";
import { ProductRail } from "@/app/components/ui/ProductGrid";
import { cx } from "@/app/components/ui/cx";
import { getMostFakedProducts, type CatalogProduct } from "@/lib/catalog";
import { DEFAULT_OPEN_GRAPH, whatsappLink } from "@/lib/site";
import { CodeFigure, LogoFigure, MarkingFigure, PackagingFigure, PinsFigure, PriceFigure, XrayFigure } from "./figures";

// The "Shop the originals" rail reads the cached catalogue.
export const revalidate = 60;

const TITLE = "Why genuine parts cost more, and how to spot fakes";
const DESCRIPTION =
  "Why our amplifier ICs, transistors and capacitors cost more than cheap listings of the same part numbers: originals, directly imported, every batch checked, GST invoice. And how to spot a counterfeit.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/why-genuine" },
  openGraph: { ...DEFAULT_OPEN_GRAPH, url: "/why-genuine", title: TITLE, description: DESCRIPTION },
};

// Owner-confirmed sourcing statement (DESIGN_SPEC §14), verbatim, as on About us.
const SOURCING_STATEMENT =
  "Our ICs, transistors, capacitors and other components are directly imported from authorized international sources, ensuring authenticity and traceability. Speaker drivers and audio modules are procured from reputed dealers and certified importers.";

const CHAT_URL = whatsappLink("Hi CrazyAudios, I have a question about a part (from your Why genuine page).");

const GUIDE = [
  { id: "counterfeits", label: "What counterfeits are" },
  { id: "spot-a-fake", label: "How to spot a fake" },
  { id: "what-we-do", label: "What we do" },
  { id: "originals", label: "Shop the originals" },
  { id: "questions", label: "Questions" },
];

/* ----------------------------------------------------------------- copy */

const KINDS = [
  {
    icon: <IconChip size={22} />,
    title: "Re-marked parts",
    text: "A cheaper, lower-grade or entirely different die, marked with a premium part number. It looks right on the outside; inside it is a different part.",
  },
  {
    icon: <IconRefresh size={22} />,
    title: "Recycled parts",
    text: "Parts pulled from old boards, cleaned up and sold as new. There is no way to know how hard they worked in their first life, and some are re-marked as well.",
  },
];

function IconThermometer({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M10 13.7V5a2 2 0 1 1 4 0v8.7a4 4 0 1 1-4 0Z" />
      <path d="M12 9.5v6" />
    </svg>
  );
}

const EFFECTS = [
  {
    icon: <IconBolt size={20} />,
    title: "Less output power",
    text: "A smaller or lower-grade die can't handle the current the real part is rated for, so the amplifier delivers less than it should.",
  },
  {
    icon: <IconThermometer size={20} />,
    title: "Running hot",
    text: "Weaker parts work harder for the same output and heat up faster, even on a heatsink sized for the real thing.",
  },
  {
    icon: <IconClock size={20} />,
    title: "Early failure",
    text: "They can fail at the first power-up, or weeks into use.",
  },
  {
    icon: <IconAlert size={20} />,
    title: "Damage to other parts",
    text: "A failing output device can short and take other parts with it: its partner transistor, drivers, fuses and, in the worst case, your speakers.",
  },
];

type Verdict = { tone: "good" | "bad" | "note"; text: string };

const CHECKS: Array<{ title: string; text: string; figure: ReactNode; verdicts: Verdict[] }> = [
  {
    title: "Marking quality",
    text: "Power transistors and amplifier ICs from the original makers are laser-marked: crisp, even characters set into the surface. Ink that smudges, blurry or uneven characters, or letters of different heights are warning signs.",
    figure: <MarkingFigure className="h-auto w-full" />,
    verdicts: [
      { tone: "good", text: "Crisp laser marking" },
      { tone: "bad", text: "Printed, blurred or uneven" },
    ],
  },
  {
    title: "Date and lot codes",
    text: "Originals carry a date or lot code from the manufacturer, marked in the same style as the part number. A missing code, or one that looks added later, deserves a closer look.",
    figure: <CodeFigure className="h-auto w-full" />,
    verdicts: [
      { tone: "good", text: "Code marked like the rest" },
      { tone: "bad", text: "Missing or odd code" },
    ],
  },
  {
    title: "Logo details",
    text: "Compare the maker's logo with the one in the manufacturer's own datasheet: shape, proportions and position. Counterfeits often get it slightly wrong, or leave it off.",
    figure: <LogoFigure className="h-auto w-full" />,
    verdicts: [
      { tone: "good", text: "Matches the datasheet" },
      { tone: "bad", text: "Wrong shape, size or position" },
    ],
  },
  {
    title: "Pins and plastic",
    text: "Leads should be clean and evenly plated, and the body one consistent texture. Old solder, scratches or bent leads point to a pulled part; a top face that looks different from the edges can mean the original marking was sanded off.",
    figure: <PinsFigure className="h-auto w-full" />,
    verdicts: [
      { tone: "good", text: "Clean leads, even body" },
      { tone: "bad", text: "Re-tinned leads, resurfaced top" },
    ],
  },
  {
    title: "Packaging",
    text: "Manufacturers ship in labelled tubes, reels or trays. When a shop splits a tube you will get loose parts, which is normal, but the parts themselves should still pass the checks above.",
    figure: <PackagingFigure className="h-auto w-full" />,
    verdicts: [
      { tone: "good", text: "Maker's labelled tube or reel" },
      { tone: "note", text: "Loose: check the parts" },
    ],
  },
  {
    title: "A price that's too good to be true",
    text: "A genuine part costs what it costs to make and import. When the same part number sells for a fraction of the usual price, it is fair to ask where it came from.",
    figure: <PriceFigure className="h-auto w-full" />,
    verdicts: [{ tone: "note", text: "A fraction of the usual price? Ask why." }],
  },
];

const PROMISES = [
  {
    icon: <IconCheckCircle size={22} />,
    title: "CA Certified: every batch checked",
    text: "We quality-check every batch before it goes on sale. That is what the CA Certified tag on our product pages means.",
  },
  {
    icon: <IconReceipt size={22} />,
    title: "GST invoice with every order",
    text: "A GST invoice for every order, which you can download from your order confirmation.",
  },
  {
    icon: <IconWhatsApp size={22} />,
    title: "Ask before you buy",
    text: "Not sure a part is right for your build? Send us the part number on WhatsApp first.",
  },
];

const QUESTIONS: FaqEntry[] = [
  {
    id: "why-cheaper-elsewhere",
    question: "Why is the same part number so much cheaper elsewhere?",
    answer:
      "Our components are originals, directly imported. Much cheaper listings of the same part numbers are commonly counterfeits: re-marked or recycled parts that can look right but deliver less power, run hot or fail early.",
  },
  {
    id: "directly-imported",
    question: "Are all your products directly imported?",
    answer: SOURCING_STATEMENT,
  },
  {
    id: "ca-certified",
    question: "What does CA Certified mean?",
    answer: "It means the batch was quality-checked by us before it went on sale. We check every batch.",
  },
  {
    id: "gst-invoice",
    question: "Do I get a GST invoice?",
    answer:
      "Yes, with every order. You can download it from your order confirmation page, from [Track your order](/track-your-order), or from [My orders](/orders) if you were signed in when you ordered.",
  },
  {
    id: "which-part",
    question: "I'm not sure which part I need. Can you help?",
    answer: `Yes. [Message us on WhatsApp](whatsapp) with the part number and what you are building, ${SUPPORT_HOURS}, and we will help you pick the right original.`,
  },
];

/* ------------------------------------------------------------ helpers */

function SectionHead({ id, number, title, intro }: { id: string; number: string; title: string; intro?: ReactNode }) {
  return (
    <div className="lg:col-span-4">
      <p className="type-kicker text-signal-ink">{number}</p>
      <h2 id={`${id}-title`} className="type-h2 mt-1.5 text-ink">
        {title}
      </h2>
      {intro ? <div className="mt-3 max-w-[46ch] text-[16px] leading-[25px] text-ink-2">{intro}</div> : null}
    </div>
  );
}

function VerdictTag({ verdict }: { verdict: Verdict }) {
  const tone =
    verdict.tone === "good"
      ? { icon: <IconCheck size={14} strokeWidth={3} />, chip: "bg-ok text-white", text: "text-ok" }
      : verdict.tone === "bad"
        ? { icon: <IconClose size={14} strokeWidth={3} />, chip: "bg-danger text-white", text: "text-danger" }
        : { icon: <IconInfo size={14} strokeWidth={2.5} />, chip: "bg-ink-2 text-white", text: "text-ink-2" };
  const label = verdict.tone === "good" ? "Genuine sign: " : verdict.tone === "bad" ? "Warning sign: " : "";
  return (
    <p className={cx("flex items-start gap-1.5 text-[13px] font-semibold leading-[18px]", tone.text)}>
      <span aria-hidden="true" className={cx("mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full", tone.chip)}>
        {tone.icon}
      </span>
      <span>
        <span className="sr-only">{label}</span>
        {verdict.text}
      </span>
    </p>
  );
}

async function loadOriginals(): Promise<CatalogProduct[]> {
  try {
    return await getMostFakedProducts(8);
  } catch (error) {
    // The page is about trust, not stock: render it without the rail if the catalogue is unreachable.
    console.error("[why-genuine] originals rail unavailable:", error);
    return [];
  }
}

/* --------------------------------------------------------------- page */

export default async function WhyGenuinePage() {
  const originals = await loadOriginals();
  const guide = originals.length ? GUIDE : GUIDE.filter((item) => item.id !== "originals");
  const number = (id: string) => String(guide.findIndex((item) => item.id === id) + 1).padStart(2, "0");

  return (
    <main className="flex-1 pb-16 lg:pb-24">
      <JsonLd data={faqPageJsonLd(QUESTIONS)} />

      {/* Hero: full-bleed ink on phones, a rounded ink panel on desktop. */}
      <div className="lg:page-wrap lg:pt-6">
        <section
          aria-labelledby="why-genuine-title"
          className="on-dark relative overflow-hidden bg-ink text-white lg:rounded-sheet"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.045)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.045)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(180deg,black_25%,transparent_85%)]"
          />
          <div className="relative grid gap-8 px-4 pb-7 pt-8 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-12 lg:pb-12 lg:pt-14">
            <div className="lg:col-span-7 lg:self-center">
              <p className="type-kicker text-signal">Why our prices look higher</p>
              {/* One sentence per line: each is ~10.7em wide, so 8.2vw keeps it on one line from 360px up. */}
              <h1
                id="why-genuine-title"
                className="mt-3 text-[clamp(26px,8.2vw,44px)] font-extrabold leading-[1.08] tracking-[-0.015em] [font-stretch:118%] lg:text-[clamp(40px,3.8vw,54px)] lg:leading-[1.04]"
              >
                <span className="block">Same part number.</span> <span className="block text-signal">Not the same part.</span>
              </h1>
              <p className="mt-4 max-w-[54ch] text-[17px] leading-[26px] text-white/80 lg:mt-5 lg:text-[18px] lg:leading-[28px]">
                You may have seen the parts we sell listed elsewhere for a fraction of our price. Here is the honest
                reason: our ICs, transistors, capacitors and other components are originals, directly imported. Much
                cheaper listings of the same part numbers are commonly counterfeits.
              </p>
            </div>

            <figure className="lg:col-span-5">
              <XrayFigure className="mx-auto h-auto w-full max-w-[400px]" />
              <div className="mx-auto mt-3 grid max-w-[400px] grid-cols-2 gap-3 text-center">
                <p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-[3px] font-mono text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-ok">
                    <IconCheck size={12} strokeWidth={3} />
                    Original
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-[18px] text-white/75">Full-size die</span>
                </p>
                <p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-[3px] font-mono text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-danger">
                    <IconClose size={12} strokeWidth={3} />
                    Counterfeit
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-[18px] text-white/75">Smaller die, same marking</span>
                </p>
              </div>
              <figcaption className="mx-auto mt-4 max-w-[400px] text-center text-[12px] leading-[17px] text-white/55">
                Illustration: two parts with the same marking, cut away to show the silicon inside.
              </figcaption>
            </figure>

            <ul className="grid gap-3 border-t border-white/12 pt-5 text-[14px] leading-5 text-white/85 sm:grid-cols-3 lg:col-span-12 lg:pt-6">
              <li className="flex items-center gap-2.5">
                <IconShield size={18} className="shrink-0 text-signal" />
                Components directly imported
              </li>
              <li className="flex items-center gap-2.5">
                <IconCheckCircle size={18} className="shrink-0 text-signal" />
                Every batch quality-checked
              </li>
              <li className="flex items-center gap-2.5">
                <IconReceipt size={18} className="shrink-0 text-signal" />
                GST invoice with every order
              </li>
            </ul>
          </div>
        </section>
      </div>

      {/* In this guide */}
      <nav aria-label="In this guide" className="page-wrap mt-6 lg:mt-8">
        <div className="flex items-center gap-3 [contain:inline-size]">
          <p className="type-kicker hidden shrink-0 text-muted sm:block">In this guide</p>
          <ol className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {guide.map((item, index) => (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-[14px] font-medium text-ink transition-colors duration-150 hover:border-ink"
                >
                  <span className="type-mono text-[12px] text-muted">{String(index + 1).padStart(2, "0")}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      {/* 01 What counterfeits are */}
      <section id="counterfeits" aria-labelledby="counterfeits-title" className="page-wrap section-y">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
          <SectionHead
            id="counterfeits"
            number={number("counterfeits")}
            title="What counterfeit parts are"
            intro={<p>A counterfeit is a part sold as something it is not. In audio parts, two kinds are common.</p>}
          />
          <div className="lg:col-span-8">
            <ul className="grid gap-3 sm:grid-cols-2">
              {KINDS.map((kind) => (
                <li key={kind.title} className="rounded-card border border-line bg-card p-5">
                  <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-full bg-signal-soft text-signal-ink">
                    {kind.icon}
                  </span>
                  <h3 className="type-h3 mt-4 text-ink">{kind.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-[23px] text-ink-2">{kind.text}</p>
                </li>
              ))}
            </ul>

            <h3 className="type-h3 mt-10 text-ink">What they do to an amplifier</h3>
            <dl className="mt-4 rounded-card border border-line bg-card">
              {EFFECTS.map((effect, index) => (
                <div
                  key={effect.title}
                  className={cx("grid gap-1 px-4 py-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6 sm:px-5", index > 0 && "border-t border-line")}
                >
                  <dt className="flex items-center gap-2.5 text-[15px] font-semibold leading-[22px] text-ink">
                    <span aria-hidden="true" className="shrink-0 text-signal-ink">
                      {effect.icon}
                    </span>
                    {effect.title}
                  </dt>
                  <dd className="pl-[30px] text-[15px] leading-[23px] text-ink-2 sm:pl-0">{effect.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* 02 How to spot a fake */}
      <section id="spot-a-fake" aria-labelledby="spot-a-fake-title" className="border-y border-line bg-card/60">
        <div className="page-wrap section-y">
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
            <SectionHead id="spot-a-fake" number={number("spot-a-fake")} title="How to spot a fake" />
            <div className="text-[16px] leading-[25px] text-ink-2 lg:col-span-8 lg:pt-7">
              <p className="max-w-[60ch]">
                No single check is proof on its own; together they tell you a lot. Compare what you have with the
                manufacturer&apos;s own datasheet and product photos, which are free to download from the maker&apos;s
                website.
              </p>
            </div>
          </div>

          <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:mt-10 lg:grid-cols-3">
            {CHECKS.map((check, index) => (
              <li key={check.title} className="flex flex-col overflow-hidden rounded-card border border-line bg-card">
                <figure className="relative border-b border-line bg-paper px-4 pb-4 pt-8 sm:px-6">
                  <span className="type-kicker absolute left-4 top-3 text-muted">Fig. {index + 1}</span>
                  {check.figure}
                  <figcaption
                    className={cx(
                      "mt-3 grid min-h-9 justify-items-center gap-3",
                      check.verdicts.length > 1 ? "grid-cols-2" : "grid-cols-1"
                    )}
                  >
                    {check.verdicts.map((verdict) => (
                      <VerdictTag key={verdict.text} verdict={verdict} />
                    ))}
                  </figcaption>
                </figure>
                <div className="flex-1 p-5">
                  <h3 className="type-h3 text-ink">{check.title}</h3>
                  <p className="mt-2 text-[15px] leading-[23px] text-ink-2">{check.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 03 What we do */}
      <section id="what-we-do" aria-labelledby="what-we-do-title" className="page-wrap section-y">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
          <SectionHead id="what-we-do" number={number("what-we-do")} title="What we do about it" />
          <div className="lg:col-span-8">
            <figure className="rounded-card border border-line bg-card p-5 sm:p-7">
              <svg viewBox="0 0 32 24" width={32} height={24} aria-hidden="true" className="text-signal">
                <path
                  d="M0 24V14.4C0 6.6 3.6 1.8 10.8 0l1.6 3.2C8.4 4.6 6.4 7.4 6.2 11.2H12V24H0Zm19.6 0V14.4C19.6 6.6 23.2 1.8 30.4 0L32 3.2c-4 1.4-6 4.2-6.2 8H31.6V24H19.6Z"
                  fill="currentColor"
                />
              </svg>
              <blockquote className="mt-4 text-[19px] font-medium leading-[29px] tracking-[-0.005em] text-ink lg:text-[21px] lg:leading-[32px]">
                {SOURCING_STATEMENT}
              </blockquote>
              <figcaption className="type-kicker mt-5 text-muted">Our sourcing · CrazyAudios</figcaption>
            </figure>

            <ul className="mt-4 grid gap-3 md:grid-cols-3">
              {PROMISES.map((promise) => (
                <li key={promise.title} className="rounded-card border border-line bg-card p-5">
                  <span aria-hidden="true" className="text-signal-ink">
                    {promise.icon}
                  </span>
                  <h3 className="mt-3 text-[16px] font-bold leading-[22px] text-ink [font-stretch:112%]">{promise.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-[21px] text-ink-2">{promise.text}</p>
                </li>
              ))}
            </ul>

            <Link
              href="/about-us"
              className="group mt-5 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink hover:text-signal-ink"
            >
              More about CrazyAudios
              <IconArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 04 Shop the originals (only when the catalogue answered) */}
      {originals.length ? (
        <section id="originals" aria-labelledby="originals-title" className="border-y border-line bg-card/60">
          <div className="page-wrap section-y">
            <p className="type-kicker text-signal-ink">{number("originals")}</p>
            <h2 id="originals-title" className="type-h2 mt-1.5 text-ink">
              Shop the originals
            </h2>
            <p className="mt-2 max-w-[56ch] text-[15px] leading-[22px] text-ink-2">
              Power transistors, amplifier ICs and op-amps in stock now: originals, directly imported, with a GST
              invoice.
            </p>
            <ProductRail products={originals} label="Original parts in stock" headingLevel="h3" className="mt-6" />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/category/amplifier-ics" size="lg" fullWidth className="sm:w-auto">
                Shop amplifier ICs
              </ButtonLink>
              <ButtonLink href="/category/transistors" variant="outline" size="lg" fullWidth className="sm:w-auto">
                Shop transistors
              </ButtonLink>
            </div>
          </div>
        </section>
      ) : null}

      {/* 05 Questions */}
      <section id="questions" aria-labelledby="questions-title" className="page-wrap section-y">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
          <SectionHead id="questions" number={number("questions")} title="Common questions" />
          <div className="lg:col-span-8">
            <FaqList items={QUESTIONS} whatsappSource="why_genuine" whatsappHref={CHAT_URL} />
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <div className="page-wrap">
        <section aria-labelledby="ask-title" className="on-dark relative overflow-hidden rounded-sheet bg-ink px-5 py-8 text-white sm:px-8 lg:px-12 lg:py-12">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center lg:gap-10">
            <div className="lg:col-span-7">
              <h2 id="ask-title" className="type-h2 text-white">
                Questions about a part? Ask us on WhatsApp.
              </h2>
              <p className="mt-3 max-w-[52ch] text-[16px] leading-[25px] text-white/75">
                Send us the part number and what you are building before you order. We reply {SUPPORT_HOURS}{" "}
                (messages only).
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:col-span-5 lg:items-end">
              <WhatsAppButton source="why_genuine" href={CHAT_URL} fullWidth className="lg:w-auto">
                Ask us on WhatsApp
              </WhatsAppButton>
              <p className="text-center text-[14px] leading-5 text-white/65 lg:text-right">
                or email{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-white underline decoration-white/40 underline-offset-[3px] hover:decoration-white">
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </div>
          </div>
          {!originals.length ? (
            <div className="mt-6 flex flex-col gap-3 border-t border-white/12 pt-6 sm:flex-row">
              <ButtonLink href="/category/amplifier-ics" variant="outline-on-dark" size="lg" fullWidth className="sm:w-auto">
                Shop amplifier ICs
              </ButtonLink>
              <ButtonLink href="/category/transistors" variant="outline-on-dark" size="lg" fullWidth className="sm:w-auto">
                Shop transistors
              </ButtonLink>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
