import { ProductGridSkeleton, Skeleton } from "./components/ui/Skeleton";

/**
 * Route-level loading state: a static page skeleton, never "Loading…".
 * Shown instantly on client-side navigations to dynamic routes. On full page
 * loads the real content streams in before first paint, so keep this light
 * (it ships in every page's HTML).
 */
export default function Loading() {
  return (
    <main className="page-wrap flex-1 pb-12 pt-4 lg:pt-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading
      </span>
      <div aria-hidden="true">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-5 h-8 w-64 max-w-full lg:h-10" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </div>
      <ProductGridSkeleton count={4} className="mt-6" />
    </main>
  );
}
