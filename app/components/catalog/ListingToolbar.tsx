import Link from "next/link";
import { IconClose } from "@/app/components/icons";
import { buttonClasses } from "@/app/components/ui/Button";
import { cx } from "@/app/components/ui/cx";
import { formatNumber } from "@/lib/format";
import { KeepActiveInView } from "./KeepActiveInView";
import { InStockToggle, SortSelect, type SortChoice } from "./ListingControls";
import type { ListingParams } from "./listing";

// Spec §7: Featured, Price ↑, Price ↓, Newest. The phone's picker shows the
// long labels; the pill shows the short one.
const SORT_CHOICES: SortChoice[] = [
  { value: "featured", label: "Featured", short: "Featured" },
  { value: "price-asc", label: "Price: low to high", short: "Price ↑" },
  { value: "price-desc", label: "Price: high to low", short: "Price ↓" },
  { value: "newest", label: "Newest first", short: "Newest" },
];

export type BrandChip = { label: string; count: number; href: string; active: boolean };

/**
 * A listing's filters: Sort and "In stock only" (a GET form on the listing
 * URL: without JavaScript the shopper taps "Apply", with it each change
 * applies at once) and, with 2+ brands, brand chips (plain links; tap the
 * active one again to clear it). Phones: the chips get their own sideways-
 * scrolling row. Desktop: everything sits in one wrapping row with the count.
 */
export function ListingToolbar({
  action,
  params,
  brand,
  brands,
  total,
  shown,
  noun,
  className,
}: {
  /** The listing path the form submits to (no query string). */
  action: string;
  params: ListingParams;
  /** Active brand filter, kept when sorting. */
  brand: string | null;
  brands: BrandChip[];
  total: number;
  shown: number;
  /** Plural noun for counts ("parts", "drivers"). */
  noun: string;
  className?: string;
}) {
  const filtered = shown !== total;
  const count = filtered ? `Showing ${formatNumber(shown)} of ${formatNumber(total)} ${noun}` : `${formatNumber(total)} ${noun}`;
  return (
    <div className={cx("lg:flex lg:flex-wrap lg:items-center lg:gap-2", className)}>
      <form action={action} method="get" className="flex flex-wrap items-center gap-2 lg:contents">
        {brand ? <input type="hidden" name="brand" value={brand} /> : null}
        <SortSelect value={params.sort} options={SORT_CHOICES} />
        <InStockToggle checked={params.inStock} />
        <noscript>
          <button type="submit" className={buttonClasses({ variant: "dark", size: "md" })}>
            Apply
          </button>
        </noscript>
      </form>

      {brands.length ? (
        <>
          <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-line-strong lg:block" />
          <div className="mt-2 [contain:inline-size] lg:mt-0 lg:contents">
            <ul
              id="brand-filters"
              role="list"
              aria-label="Filter by brand"
              className="no-scrollbar relative -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6 lg:contents"
            >
              {brands.map((chip) => (
                <li key={chip.label} className="shrink-0">
                  <Link
                    href={chip.href}
                    scroll={false}
                    aria-current={chip.active ? "true" : undefined}
                    className={cx(
                      "relative inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[14px] font-medium leading-5 transition-colors duration-150",
                      chip.active ? "border-ink bg-ink text-white" : "border-line-strong bg-card text-ink-2 hover:border-ink hover:text-ink"
                    )}
                  >
                    {chip.label}
                    <span className={cx("font-mono text-[12px] tabular", chip.active ? "text-white/65" : "text-muted")}>{chip.count}</span>
                    {chip.active ? (
                      <>
                        <IconClose size={14} strokeWidth={2.25} className="-mr-1" />
                        <span className="sr-only">(selected: tap to remove this filter)</span>
                      </>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
            <KeepActiveInView listId="brand-filters" />
          </div>
        </>
      ) : null}

      <p role="status" className="ml-auto hidden pl-3 text-[14px] leading-5 text-muted tabular lg:block">
        {count}
      </p>
      {filtered ? (
        <p role="status" className="mt-2 text-[14px] leading-5 text-muted tabular lg:hidden">
          {count}
        </p>
      ) : null}
    </div>
  );
}
