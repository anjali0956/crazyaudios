import type { ReactNode } from "react";
import { cx } from "./cx";
import { ProductCard, type ProductCardData } from "./ProductCard";

/**
 * Responsive product grid: 2 columns on phones (12px gap), 3 from 768px,
 * 4 from 1100px. Pass products, or children for custom tiles.
 *
 *   <ProductGrid products={products} priorityCount={2} />
 */
export function ProductGrid({
  products,
  priorityCount = 0,
  headingLevel,
  className,
  children,
}: {
  products?: ProductCardData[];
  /** How many leading cards load their photo eagerly (first visible row). */
  priorityCount?: number;
  headingLevel?: "h2" | "h3";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <ul role="list" className={cx("grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:gap-5 wide:grid-cols-4", className)}>
      {products
        ? products.map((product, index) => (
            <li key={product._id} className="min-w-0">
              <ProductCard product={product} priority={index < priorityCount} headingLevel={headingLevel} />
            </li>
          ))
        : children}
    </ul>
  );
}

/**
 * Horizontal, swipeable row of cards (related products). Bleeds to the
 * screen edge on phones; no auto-scroll.
 */
export function ProductRail({
  products,
  label,
  headingLevel,
  className,
}: {
  products: ProductCardData[];
  /** Accessible name for the list, e.g. "Related products". */
  label: string;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  return (
    <ul
      role="list"
      aria-label={label}
      className={cx(
        // contain:inline-size keeps the scroller's content from widening grid/flex parents.
        "no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [contain:inline-size] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:px-0",
        className
      )}
    >
      {products.map((product) => (
        <li
          key={product._id}
          className="w-[44vw] min-w-[156px] max-w-[232px] shrink-0 snap-start md:w-[calc((100%-24px)/3)] md:max-w-none lg:w-[calc((100%-36px)/4)] wide:w-[calc((100%-48px)/5)]"
        >
          <ProductCard product={product} sizes="(min-width: 1100px) 220px, (min-width: 768px) 30vw, 44vw" headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
