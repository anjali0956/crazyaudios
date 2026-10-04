import type { ReactNode } from "react";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "signal" | "ok" | "warn" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "border border-line bg-paper text-ink-2",
  signal: "bg-signal text-ink",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};

/**
 * Mono uppercase pill for short states: "Sale −10%", "CA Certified", "New".
 *
 *   <Badge tone="signal">Sale −10%</Badge>
 *   <Badge tone="ok" icon={<IconCheck size={12} strokeWidth={3} />}>CA Certified</Badge>
 */
export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-[3px] font-mono text-[11px] font-semibold uppercase leading-4 tracking-[0.08em]",
        TONES[tone],
        className
      )}
    >
      {icon ? <span className="-ml-0.5 inline-flex shrink-0">{icon}</span> : null}
      {children}
    </span>
  );
}

/**
 * Part number / package chip: mono 12px, hairline border, 6px radius.
 *
 *   <PartChip>LM3886</PartChip> <PartChip>TO-220</PartChip>
 */
export function PartChip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-chip border border-line-strong bg-card px-2 py-0.5 font-mono text-[12px] font-medium uppercase leading-4 tracking-[0.02em] text-ink-2",
        className
      )}
    >
      {children}
    </span>
  );
}
