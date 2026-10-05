"use client";

import { useState } from "react";
import { IconMinus, IconPlus } from "../icons";
import { cx } from "./cx";

export type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  /** Smallest value (default: one step). */
  min?: number;
  /** Largest value, usually the stock. Rounded down to whole steps. */
  max?: number;
  /** Increment, e.g. the pack size (values stay multiples of it). */
  step?: number;
  /** Accessible name for the group, e.g. "Quantity for TIP35". */
  label?: string;
  size?: "md" | "lg";
  disabled?: boolean;
  className?: string;
};

function clampToStep(value: number, min: number, max: number, step: number) {
  const top = Math.max(min, Math.floor(max / step) * step);
  const snapped = Math.round(value / step) * step;
  return Math.min(top, Math.max(min, snapped));
}

/**
 * − [ n ] + with 44px buttons that disable at the bounds. The middle accepts
 * typing; it snaps to whole steps within min/max on blur or Enter.
 *
 *   <QuantityStepper value={qty} onChange={setQty} step={product.minQty} max={product.stock} />
 */
export function QuantityStepper({
  value,
  onChange,
  min,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  label = "Quantity",
  size = "md",
  disabled = false,
  className,
}: QuantityStepperProps) {
  const unit = Math.max(1, Math.floor(step));
  const floor = Math.max(unit, min ?? unit);
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    setDraft(null);
    const parsed = Number.parseInt(raw.replace(/\D/g, ""), 10);
    if (!Number.isFinite(parsed)) return;
    const next = clampToStep(parsed, floor, max, unit);
    if (next !== value) onChange(next);
  };

  const canDecrease = !disabled && value - unit >= floor;
  const canIncrease = !disabled && value + unit <= max;
  const height = size === "lg" ? "h-[52px]" : "h-11";
  // Focus rings are drawn inside (-outline-offset-2): the rounded group clips anything outside it.
  const button =
    "grid w-11 shrink-0 place-items-center text-ink transition-colors duration-150 hover:bg-ink/5 focus-visible:-outline-offset-2 disabled:pointer-events-none disabled:text-line-strong";

  return (
    <div
      role="group"
      aria-label={label}
      className={cx("inline-flex items-stretch overflow-hidden rounded-card border border-line-strong bg-card", height, className)}
    >
      <button type="button" aria-label="Decrease quantity" className={button} disabled={!canDecrease} onClick={() => onChange(value - unit)}>
        <IconMinus size={18} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        disabled={disabled}
        value={draft ?? String(value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(event.currentTarget.value);
          }
        }}
        className="w-12 min-w-0 border-x border-line bg-transparent text-center text-[16px] font-semibold text-ink tabular focus-visible:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-ink"
      />
      <button type="button" aria-label="Increase quantity" className={button} disabled={!canIncrease} onClick={() => onChange(value + unit)}>
        <IconPlus size={18} />
      </button>
    </div>
  );
}
