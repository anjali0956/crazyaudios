"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { CartItem } from "@/app/components/cart/CartProvider";
import { OrderTotals, type OrderTotalsProps } from "@/app/components/checkout/OrderTotals";
import { IconChevronDown } from "@/app/components/icons";
import { cx } from "@/app/components/ui/cx";
import { ProductImage } from "@/app/components/ui/ProductImage";
import { displayName } from "@/lib/display";
import { formatINR, formatNumber, pluralize } from "@/lib/format";

/** The order's lines: 48px photo, name, quantity × price, line total. */
export function SummaryLines({ items, className }: { items: CartItem[]; className?: string }) {
  return (
    <ul className={cx("divide-y divide-line", className)}>
      {items.map((item) => {
        const name = displayName(item.name);
        const price = Number(item.price) || 0;
        return (
          <li key={item._id} className="flex items-center gap-3 py-3 first:pt-0">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-chip border border-line bg-card">
              <ProductImage src={item.image} alt={name} fill sizes="48px" className="object-contain p-1" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[14px] font-medium leading-5 text-ink">{name}</p>
              <p className="text-[12.5px] leading-4 text-muted tabular">
                {formatNumber(item.quantity)} × {formatINR(price)}
              </p>
            </div>
            <p className="type-price shrink-0 text-[14px] leading-5 text-ink">{formatINR(price * item.quantity)}</p>
          </li>
        );
      })}
    </ul>
  );
}

type SummaryProps = {
  items: CartItem[];
  count: number;
  totals: OrderTotalsProps;
  /** Under the totals (free-shipping hint). */
  footnote?: ReactNode;
};

/** Phones: a bar under the header ("Order summary · 2 items ▾ ₹1,095") that opens the full summary. */
export function MobileSummary({
  items,
  count,
  totals,
  footnote,
  open,
  onToggle,
}: SummaryProps & { open: boolean; onToggle: () => void }) {
  return (
    <div className="-mx-4 border-b border-line bg-card sm:-mx-6 lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="checkout-summary-panel"
        onClick={onToggle}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left sm:px-6"
      >
        <span className="flex min-w-0 items-center gap-1.5 text-[14px] font-medium leading-5 text-ink">
          Order summary · {pluralize(count, "item")}
          <IconChevronDown
            size={18}
            className={cx("shrink-0 text-ink-2 transition-transform duration-150 ease-out", open && "rotate-180")}
          />
        </span>
        <span className="type-price shrink-0 text-[16px] leading-6 text-ink">{formatINR(totals.total)}</span>
      </button>
      <div id="checkout-summary-panel" hidden={!open} className="border-t border-line px-4 pb-4 pt-3 sm:px-6">
        <SummaryLines items={items} />
        <OrderTotals {...totals} className="mt-3 border-t border-line pt-3" />
        {footnote}
        <Link
          href="/cart"
          prefetch={false}
          className="mt-2 inline-flex min-h-11 items-center text-[14px] font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
        >
          Edit cart
        </Link>
      </div>
    </div>
  );
}

/** Desktop: the right-hand column with the lines, totals and the pay button. */
export function DesktopSummary({ items, count, totals, footnote, action }: SummaryProps & { action: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="type-h3 text-ink">Order summary</h2>
        <Link
          href="/cart"
          className="text-[14px] font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
        >
          Edit cart
        </Link>
      </div>
      <p className="mt-0.5 text-[13px] text-muted">{pluralize(count, "item")}</p>
      <SummaryLines items={items} className="mt-4 max-h-[320px] overflow-y-auto pr-1" />
      <OrderTotals {...totals} className="mt-3 border-t border-line pt-3" />
      {footnote}
      <div className="mt-5">{action}</div>
    </div>
  );
}
