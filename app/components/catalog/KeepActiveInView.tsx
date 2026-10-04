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
    const target = item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2;
    list.scrollLeft = Math.max(0, Math.min(target, list.scrollWidth - list.clientWidth));
  }, [listId]);
  return null;
}
