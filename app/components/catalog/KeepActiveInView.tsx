"use client";

import { useEffect } from "react";

/**
 * On load, scrolls a horizontal list so its active item (aria-current) is in
 * view. Only the list moves, never the page.
 */
export function KeepActiveInView({ listId }: { listId: string }) {
  useEffect(() => {
    const list = document.getElementById(listId);
    const active = list?.querySelector<HTMLElement>("[aria-current]");
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    const item = active.closest("li") ?? active;
    // Start-align on the previous tab (or the active one) instead of centring: centring left a
    // clipped label at the left edge ("…5 Amplifier ICs"), which reads as a glitch; a clip on
    // the right reads as "more this way".
    const pad = parseFloat(getComputedStyle(list).paddingLeft) || 0;
    const previous = item.previousElementSibling as HTMLElement | null;
    let target = (previous ?? item).offsetLeft - pad;
    if (item.offsetLeft + item.offsetWidth - target > list.clientWidth - pad) target = item.offsetLeft - pad;
    list.scrollLeft = Math.max(0, Math.min(target, list.scrollWidth - list.clientWidth));
  }, [listId]);
  return null;
}
