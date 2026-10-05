"use client";

import { useEffect } from "react";

/**
 * Call from a page's sticky bottom bar (product buy bar, checkout pay bar).
 * While `visible`, <html data-bottom-bar> is set and --bottom-bar-h holds the
 * bar height, so toasts float above it and the floating WhatsApp button hides
 * (the bar carries its own WhatsApp action).
 *
 *   useBottomBar(showStickyBar, 72);
 */
/**
 * Keeps the end of the page clear of a fixed bottom bar, so the footer's last
 * links (Privacy, Terms) are never hidden under it. While `active`, <html> gets
 * a bottom padding of the bar height, painted `night` so it reads as part of the
 * footer's bottom strip (body keeps its paper background). Pass a steady
 * `active` (e.g. "on a phone and the bar can show"), not the bar's visibility,
 * so the page height does not jump while the bar slides in and out.
 *
 *   useReservedBottomSpace(isPhone && hasItems, 76);
 */
export function useReservedBottomSpace(active: boolean, heightPx = 72) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const previous = { padding: root.style.paddingBottom, background: root.style.backgroundColor };
    root.style.paddingBottom = `calc(${Math.max(0, Math.round(heightPx))}px + env(safe-area-inset-bottom, 0px))`;
    root.style.backgroundColor = "var(--color-night)";
    return () => {
      root.style.paddingBottom = previous.padding;
      root.style.backgroundColor = previous.background;
    };
  }, [active, heightPx]);
}

export function useBottomBar(visible: boolean, heightPx = 72) {
  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    root.dataset.bottomBar = "on";
    root.style.setProperty("--bottom-bar-h", `${Math.max(0, Math.round(heightPx))}px`);
    return () => {
      delete root.dataset.bottomBar;
      root.style.removeProperty("--bottom-bar-h");
    };
  }, [visible, heightPx]);
}
