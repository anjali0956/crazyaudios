import Link from "next/link";
import { WHY_GENUINE_HREF } from "@/app/components/chrome/links";
import { IconArrowRight } from "@/app/components/icons";

// Three short, honest points (spec §11.3). No statistics, no named sellers.
const POINTS = [
  {
    title: "Re-marked or recycled",
    text: "Cheap listings are often a lower-grade or different die marked as the real part, or a used part pulled from an old board.",
  },
  {
    title: "Runs hot, fails early",
    text: "A counterfeit can run hot, deliver less power than its datasheet promises, or fail long before it should.",
  },
  {
    title: "Imported and checked",
    text: "We import our components directly from authorised international sources and quality-check every batch (CA Certified).",
  },
];

/** "Why original matters": an ink band with three numbered points and the /why-genuine link. */
export function WhyOriginal() {
  return (
    <section aria-labelledby="home-why" className="pt-10 lg:mx-auto lg:max-w-[1200px] lg:px-8 lg:pt-[72px]">
      <div className="on-dark bg-ink px-4 py-10 text-white sm:px-6 lg:grid lg:grid-cols-12 lg:gap-12 lg:rounded-sheet lg:px-12 lg:py-14">
        <div className="lg:col-span-4">
          <p className="type-kicker text-signal">Why original matters</p>
          <h2 id="home-why" className="type-h2 mt-1.5 text-white">
            The same part number isn’t always the same part.
          </h2>
          <Link
            href={WHY_GENUINE_HREF}
            prefetch={false}
            className="group mt-5 hidden min-h-11 items-center gap-1.5 rounded-chip text-[15px] font-semibold text-white underline decoration-white/35 underline-offset-[5px] hover:decoration-signal lg:inline-flex"
          >
            How to spot a counterfeit
            <IconArrowRight size={16} className="text-signal transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
        <ol role="list" className="mt-7 grid gap-6 sm:grid-cols-3 sm:gap-6 lg:col-span-8 lg:mt-1 lg:gap-8">
          {POINTS.map((point, index) => (
            <li key={point.title} className="border-t border-white/15 pt-4">
              <p className="font-mono text-[12px] font-medium leading-4 tracking-[0.12em] text-signal">0{index + 1}</p>
              <h3 className="mt-2 text-[17px] font-bold leading-[23px] text-white [font-stretch:108%]">{point.title}</h3>
              <p className="mt-1.5 text-[15px] leading-[22px] text-white/70">{point.text}</p>
            </li>
          ))}
        </ol>
        <Link
          href={WHY_GENUINE_HREF}
          prefetch={false}
          className="group mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-chip text-[15px] font-semibold text-white underline decoration-white/35 underline-offset-[5px] hover:decoration-signal lg:hidden"
        >
          How to spot a counterfeit
          <IconArrowRight size={16} className="text-signal transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
