import { formatDiscount, formatINR } from "@/lib/format";
import { cx } from "./cx";

export type PriceSize = "sm" | "md" | "lg";

const NOW: Record<PriceSize, string> = {
  sm: "text-[17px] leading-6",
  md: "text-[21px] leading-7",
  lg: "text-[30px] leading-9 tracking-[-0.01em] lg:text-[34px] lg:leading-10",
};

const MRP: Record<PriceSize, string> = {
  sm: "text-[13px] leading-5",
  md: "text-[15px] leading-5",
  lg: "text-[16px] leading-6 lg:text-[17px]",
};

export type PriceProps = {
  /** What the customer pays (GST incl.). */
  price: number;
  /** Struck price. Shown only when higher than `price`. */
  mrp?: number | null;
  size?: PriceSize;
  /** Unit suffix after the price, e.g. "pack of 10" -> "₹12 · pack of 10". */
  unit?: string;
  /** Show the "Incl. GST" line (default: on for md and lg). */
  showTax?: boolean;
  /** Replace the default "Incl. GST" line, e.g. "Incl. GST · free shipping over ₹1,499". */
  taxNote?: string;
  /** Show the "−10%" chip (default: md and lg; cards already carry a Sale badge). */
  showDiscount?: boolean;
  className?: string;
};

/**
 * Price block: current price (ink, 700, tabular), struck MRP, "−10%" chip
 * and an "Incl. GST" micro line. Pass already-computed display prices
 * (product.sellPrice / product.sellMrp from lib/catalog, or pricingOf()).
 *
 *   <Price price={900} mrp={1000} size="lg" />
 *   <Price price={12} size="sm" unit="pack of 10" />   // "₹12 · pack of 10"
 */
export function Price({ price, mrp, size = "md", unit, showTax, taxNote, showDiscount, className }: PriceProps) {
  const struck = mrp != null && mrp > price ? mrp : null;
  const discount = struck ? Math.round((1 - price / struck) * 100) : 0;
  const tax = showTax ?? size !== "sm";
  const chip = (showDiscount ?? size !== "sm") && discount > 0;

  return (
    <div className={className}>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={cx("type-price text-ink", NOW[size])}>
          {struck ? <span className="sr-only">Sale price </span> : null}
          {formatINR(price)}
        </span>
        {unit ? <span className={cx("text-ink-2", size === "lg" ? "text-[15px]" : "text-[13px]")}>· {unit}</span> : null}
        {struck ? (
          <>
            <del className={cx("tabular text-muted decoration-muted/70", MRP[size])}>
              <span className="sr-only">Regular price </span>
              {formatINR(struck)}
            </del>
            {chip ? (
              <span
                className={cx(
                  "self-center rounded-full bg-ok-soft px-2 font-mono font-semibold text-ok",
                  size === "sm" ? "py-px text-[11px] leading-4" : "py-0.5 text-[12px] leading-4"
                )}
              >
                {formatDiscount(discount)}
              </span>
            ) : null}
          </>
        ) : null}
      </p>
      {tax ? <p className="mt-0.5 text-[12px] leading-4 text-muted lg:text-[13px] lg:leading-[18px]">{taxNote ?? "Incl. GST"}</p> : null}
    </div>
  );
}
