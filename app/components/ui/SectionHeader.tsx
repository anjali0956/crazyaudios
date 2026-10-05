import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowRight } from "../icons";
import { cx } from "./cx";

/**
 * Kicker + heading (+ optional "View all" link) above a section.
 *
 *   <SectionHeader kicker="Featured" title="Builder favourites" href="/category/amplifier-ics" linkLabel="View all" />
 */
export function SectionHeader({
  kicker,
  title,
  description,
  href,
  linkLabel = "View all",
  as: Heading = "h2",
  id,
  tone = "light",
  className,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  href?: string;
  linkLabel?: string;
  as?: "h1" | "h2" | "h3";
  /** id for the heading (use with aria-labelledby on the <section>). */
  id?: string;
  /** "dark" for ink bands. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cx("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {kicker ? <p className={cx("type-kicker", dark ? "text-signal" : "text-signal-ink")}>{kicker}</p> : null}
        <Heading id={id} className={cx(Heading === "h1" ? "type-h1" : "type-h2", kicker ? "mt-1.5" : "", dark ? "text-white" : "text-ink")}>
          {title}
        </Heading>
        {description ? (
          <p className={cx("mt-2 max-w-[62ch] text-[15px] leading-[22px]", dark ? "text-white/75" : "text-ink-2")}>{description}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className={cx(
            "group -mr-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-chip px-2 text-[14px] font-semibold",
            dark ? "text-white hover:text-signal" : "text-ink hover:text-signal-ink"
          )}
        >
          {linkLabel}
          <IconArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
