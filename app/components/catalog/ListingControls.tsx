"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { IconCheck, IconChevronDown } from "@/app/components/icons";
import { cx } from "@/app/components/ui/cx";

// Client islands for the listing toolbar. The toolbar itself is a plain GET
// form (server-rendered, with an "Apply" button inside <noscript>), so sorting
// and the in-stock filter work without JavaScript; with JavaScript a change
// applies at once through a client navigation.

const RESULTS_ID = "listing-results";

/** Navigate to the form's URL with its current fields (defaults left out). */
function useApplyForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Dim the results while the next page is on its way.
  useEffect(() => {
    const results = document.getElementById(RESULTS_ID);
    if (!results) return;
    if (pending) results.setAttribute("aria-busy", "true");
    else results.removeAttribute("aria-busy");
  }, [pending]);

  return (form: HTMLFormElement | null) => {
    if (!form) return;
    const query = new URLSearchParams();
    for (const [key, raw] of new FormData(form)) {
      const value = String(raw);
      if (!value || (key === "sort" && value === "featured")) continue;
      query.set(key, value);
    }
    const path = new URL(form.action, window.location.href).pathname;
    const qs = query.toString();
    startTransition(() => router.push(qs ? `${path}?${qs}` : path, { scroll: false }));
  };
}

const PILL =
  "relative inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[14px] leading-5 transition-colors duration-150 " +
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal-ink";

export type SortChoice = { value: string; label: string; short: string };

/** "Sort: Featured ▾" pill over a native <select> (the phone's own picker). */
export function SortSelect({ value, options }: { value: string; options: SortChoice[] }) {
  const apply = useApplyForm();
  const [selected, setSelected] = useState(value);
  // Follow the URL when it changes underneath (back/forward).
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    setSelected(value);
  }
  const current = options.find((option) => option.value === selected) ?? options[0];

  return (
    <label className={cx(PILL, "border-line-strong bg-card text-ink hover:border-ink")}>
      <span className="sr-only">Sort by</span>
      <span aria-hidden="true">
        <span className="text-muted">Sort:</span> <span className="font-semibold">{current?.short}</span>
      </span>
      <IconChevronDown size={16} className="-mr-1 text-ink-2" />
      <select
        name="sort"
        value={selected}
        onChange={(event) => {
          setSelected(event.currentTarget.value);
          apply(event.currentTarget.form);
        }}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** "In stock only" pill around a real checkbox. */
export function InStockToggle({ checked }: { checked: boolean }) {
  const apply = useApplyForm();
  const [on, setOn] = useState(checked);
  const [lastChecked, setLastChecked] = useState(checked);
  if (lastChecked !== checked) {
    setLastChecked(checked);
    setOn(checked);
  }

  return (
    <label
      className={cx(
        PILL,
        "group cursor-pointer font-medium",
        on ? "border-ink bg-ink text-white" : "border-line-strong bg-card text-ink-2 hover:border-ink hover:text-ink"
      )}
    >
      <input
        type="checkbox"
        name="instock"
        value="1"
        checked={on}
        onChange={(event) => {
          setOn(event.currentTarget.checked);
          apply(event.currentTarget.form);
        }}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cx(
          "grid h-[18px] w-[18px] place-items-center rounded-[5px] border",
          on ? "border-white bg-white text-ink" : "border-line-strong bg-card text-transparent"
        )}
      >
        <IconCheck size={13} strokeWidth={3} />
      </span>
      In stock only
    </label>
  );
}
