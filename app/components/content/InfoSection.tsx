import type { ReactNode } from "react";
import { cx } from "@/app/components/ui/cx";
import { Prose } from "./Prose";

/**
 * One H2 section of an info page. `number` ("01") shows as a mono kicker and
 * matches the page's contents list; `id` is the anchor the list links to.
 * Children are wrapped in <Prose> unless `prose={false}`.
 */
export function InfoSection({
  id,
  title,
  number,
  prose = true,
  className,
  children,
}: {
  id: string;
  title: ReactNode;
  number?: string;
  prose?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const headingId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={headingId} className={className}>
      {number ? <p className="type-kicker text-signal-ink">{number}</p> : null}
      <h2 id={headingId} className={cx("type-h2 text-ink", number && "mt-1.5")}>
        {title}
      </h2>
      {prose ? <Prose className="mt-4">{children}</Prose> : <div className="mt-4">{children}</div>}
    </section>
  );
}
