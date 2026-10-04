import type { SpecRow } from "@/lib/format";
import { cx } from "@/app/components/ui/cx";

/**
 * Datasheet block: "Key specs" (label column muted, value column mono) and
 * the remaining description lines as "Highlights".
 */
export function ProductSpecs({
  title,
  rows,
  highlights,
  className,
}: {
  /** Product title, for the table caption. */
  title: string;
  rows: SpecRow[];
  highlights: string[];
  className?: string;
}) {
  if (!rows.length && !highlights.length) return null;
  return (
    <div className={cx("grid gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-14", className)}>
      {rows.length ? (
        <section aria-labelledby="pdp-specs-title">
          <h2 id="pdp-specs-title" className="type-h3 text-ink lg:text-[20px] lg:leading-7">
            Key specs
          </h2>
          <div className="mt-3 overflow-hidden rounded-card border border-line bg-card">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Key specs of {title}</caption>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.label}-${index}`} className="border-t border-line first:border-t-0">
                    <th scope="row" className="w-[42%] px-3.5 py-3 align-top text-[14px] font-normal leading-5 text-muted lg:px-4">
                      {row.label}
                    </th>
                    <td className="px-3.5 py-3 align-top font-mono text-[13px] leading-5 text-ink [overflow-wrap:anywhere] lg:px-4">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {highlights.length ? (
        <section aria-labelledby="pdp-highlights-title">
          <h2 id="pdp-highlights-title" className="type-h3 text-ink lg:text-[20px] lg:leading-7">
            Highlights
          </h2>
          <ul role="list" className="mt-3 space-y-2.5">
            {highlights.map((line, index) => (
              <li key={`${index}-${line.slice(0, 24)}`} className="flex gap-3 text-[15px] leading-[22px] text-ink-2">
                <span aria-hidden="true" className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-[1px] bg-signal" />
                <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
