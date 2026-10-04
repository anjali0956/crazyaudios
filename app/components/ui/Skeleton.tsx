import { cx } from "./cx";

/**
 * Static placeholder block (no shimmer). Size it with classes.
 *
 *   <Skeleton className="h-6 w-40" />
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("rounded-chip bg-line/70", className)} />;
}

/** A few text lines; the last one is shorter. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cx("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cx("h-3.5", index === lines - 1 ? "w-3/5" : "w-full")} />
      ))}
    </div>
  );
}

/** Same footprint as <ProductCard>. */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-card">
      <div className="grid aspect-square place-items-center border-b border-line">
        <div className="h-1/2 w-1/2 rounded-card bg-paper" />
      </div>
      <div className="flex flex-col gap-2 p-3 lg:p-3.5">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-1 h-5 w-16" />
        <Skeleton className="h-3.5 w-20" />
        <div className="mt-2 h-10 rounded-card border border-line" />
      </div>
    </div>
  );
}

/** Grid of card skeletons with the <ProductGrid> layout. */
export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading products" className={className}>
      <ul role="list" className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:gap-5 wide:grid-cols-4">
        {Array.from({ length: count }, (_, index) => (
          <li key={index}>
            <ProductCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
