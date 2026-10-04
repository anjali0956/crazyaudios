"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * Renders its children only on desktop-width screens, after hydration.
 * Phones never get the markup (not just hidden): the desktop hero's product
 * tiles stay out of the phone DOM. Callers reserve the space so nothing shifts.
 */
export function DesktopOnly({ children }: { children: ReactNode }) {
  const desktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
  return desktop ? <>{children}</> : null;
}
