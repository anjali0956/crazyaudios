import { cx } from "./cx";

export type StockLevel = "out" | "low" | "in";

/** Same thresholds everywhere: ≤0 out, 1–5 low ("Only N left"), >5 in stock. */
export function stockLevel(stock: number, packSize = 1): { level: StockLevel; count: number; packs: boolean } {
  const pack = Math.max(1, Math.floor(Number(packSize) || 1));
  const units = Math.max(0, Math.floor(Number(stock) || 0));
  const count = pack > 1 ? Math.floor(units / pack) : units;
  if (count <= 0) return { level: "out", count: 0, packs: pack > 1 };
  if (count <= 5) return { level: "low", count, packs: pack > 1 };
  return { level: "in", count, packs: pack > 1 };
}

const DOT: Record<StockLevel, string> = { out: "bg-danger", low: "bg-warn", in: "bg-ok" };
const TEXT: Record<StockLevel, string> = { out: "text-danger", low: "text-warn", in: "text-ok" };

/**
 * Stock line: 8px dot + text. Static (no pulsing). For pack-only products pass
 * packSize so "Only 3 left" counts packs.
 *
 *   <StockStatus stock={product.stock} packSize={product.packSize} compact />
 */
export function StockStatus({
  stock,
  packSize,
  compact = false,
  suffix,
  className,
}: {
  stock: number;
  packSize?: number | null;
  /** Smaller text for cards and lists. */
  compact?: boolean;
  /** Extra muted text after the status, e.g. "Ships today". */
  suffix?: string;
  className?: string;
}) {
  const { level, count, packs } = stockLevel(stock, packSize ?? 1);
  const unit = packs ? (count === 1 ? " pack" : " packs") : "";
  const label = level === "out" ? "Out of stock" : level === "low" ? `Only ${count}${unit} left` : "In stock";

  return (
    <p
      className={cx(
        "flex items-center gap-2",
        compact ? "text-[13px] leading-[18px]" : "text-[15px] leading-[22px]",
        className
      )}
    >
      <span aria-hidden="true" className={cx("h-2 w-2 shrink-0 rounded-full", DOT[level])} />
      <span className={cx(TEXT[level], level === "in" ? "font-medium" : "font-semibold")}>{label}</span>
      {suffix ? <span className="text-muted">· {suffix}</span> : null}
    </p>
  );
}
