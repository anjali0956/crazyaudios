import { IconCheckCircle } from "@/app/components/icons";
import { Breadcrumbs, type Crumb } from "@/app/components/ui/Breadcrumbs";
import { formatNumber } from "@/lib/format";

/**
 * Top of a category / department page: breadcrumbs, kicker, H1 with the part
 * count, a one-line factual intro and the sourcing line (lib/categories
 * trustLine, the only place sourcing claims come from).
 */
export function ListingHeader({
  crumbs,
  kicker,
  title,
  count,
  noun,
  intro,
  trust,
}: {
  crumbs: Crumb[];
  kicker: string | null;
  title: string;
  count: number;
  noun: string;
  intro: string | null;
  trust: string | null;
}) {
  return (
    <header>
      <Breadcrumbs jsonLd items={crumbs} />
      {kicker ? <p className="type-kicker mt-2 text-signal-ink lg:mt-3">{kicker}</p> : null}
      <div className={kicker ? "mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1" : "mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:mt-3"}>
        <h1 className="type-h1 text-ink">{title}</h1>
        <p className="font-mono text-[13px] font-medium leading-5 text-muted tabular">
          {formatNumber(count)} {noun}
        </p>
      </div>
      {intro ? <p className="mt-2 max-w-[62ch] text-[15px] leading-[22px] text-ink-2 lg:text-[16px] lg:leading-6">{intro}</p> : null}
      {trust ? (
        <p className="mt-2.5 flex items-start gap-1.5 text-[13px] font-medium leading-[18px] text-ok">
          <IconCheckCircle size={16} className="mt-px shrink-0" />
          {trust}
        </p>
      ) : null}
    </header>
  );
}
