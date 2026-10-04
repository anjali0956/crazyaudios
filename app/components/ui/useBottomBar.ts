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
