import type { ReactNode } from "react";
import { cx } from "@/app/components/ui/cx";

export type Fact = { label: string; value: ReactNode };

/**
 * Datasheet-style summary table (label column muted, value column ink):
 * "At a glance" blocks on policy pages. Stacks on phones.
 */
export function FactList({ title, facts, className }: { title?: string; facts: Fact[]; className?: string }) {
  return (
    <div className={cx("rounded-card border border-line bg-card", className)}>
      {title ? <p className="type-kicker border-b border-line px-4 py-3 text-muted sm:px-5">{title}</p> : null}
      <dl>
        {facts.map((fact, index) => (
          <div
            key={fact.label}
            className={cx(
              "grid gap-1 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6 sm:px-5",
              index > 0 && "border-t border-line"
            )}
          >
            <dt className="text-[14px] leading-5 text-muted sm:pt-px">{fact.label}</dt>
            <dd className="text-[15px] leading-[22px] text-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
