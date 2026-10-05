"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** matchMedia as a hook. Returns `serverValue` during SSR and hydration. */
export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}

/** True below the lg breakpoint (1024px), where the sticky bottom bars show. */
export function useIsCompact() {
  return useMediaQuery("(max-width: 1023.98px)", true);
}

/**
 * Whether an element is on screen (IntersectionObserver). Returns a callback
 * ref to put on the element, so it also works for elements that mount later.
 * `initial` is used until the first observation.
 *
 *   const [ref, visible] = useInView<HTMLDivElement>();
 *   <div ref={ref}>…</div>
 */
export function useInView<T extends Element>(initial = false, rootMargin = "0px") {
  const [element, setElement] = useState<T | null>(null);
  const [inView, setInView] = useState(initial);
  useEffect(() => {
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, rootMargin]);
  return [setElement, inView] as const;
}
