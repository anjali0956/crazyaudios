import Link from "next/link";
import type { ReactNode } from "react";
import { IconCheckCircle, IconChevronRight, IconReceipt, IconReturn, IconShield, IconTruck } from "@/app/components/icons";
import { WHY_GENUINE_HREF } from "@/app/components/chrome/links";
import { cx } from "@/app/components/ui/cx";

function Item({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-2.5 bg-card p-3.5">
      <span className="mt-px shrink-0 text-signal-ink">{icon}</span>
      <span className="min-w-0 text-[13px] leading-[18px] text-ink-2">
        <span className="block text-[14px] font-semibold leading-5 text-ink">{title}</span>
        {children}
      </span>
    </li>
  );
}

/**
 * Trust strip under the buy box: the category's sourcing claim (trustLine,
 * spec §14) with the "why genuine" link, then GST invoice, same-day dispatch,
 * warranty and the shipping & returns policy. Only the owner's stated facts.
 */
export function TrustStrip({
  line,
  qualityChecked,
  className,
}: {
  /** trustLine() for the product's category, e.g. "Original · Directly imported · GST invoice". */
  line: string;
  /** CA Certified product (every batch quality-checked). */
  qualityChecked: boolean;
  className?: string;
}) {
  return (
    <section aria-labelledby="pdp-trust-title" className={cx("overflow-hidden rounded-card border border-line bg-card", className)}>
      <div className="flex gap-3 p-4">
        <IconShield size={22} className="mt-px shrink-0 text-ok" />
        <div className="min-w-0">
          <h2 id="pdp-trust-title" className="text-[15px] font-semibold leading-[22px] tracking-normal text-ink [font-stretch:100%]">
            {line}
          </h2>
          {qualityChecked ? (
            <p className="mt-0.5 text-[14px] leading-5 text-ink-2">Every batch is quality-checked (CA Certified).</p>
          ) : null}
          <Link
            href={WHY_GENUINE_HREF}
            prefetch={false}
            className="group mt-1 inline-flex min-h-8 items-center gap-1 text-[14px] font-semibold leading-5 text-signal-ink underline decoration-signal-ink/40 underline-offset-4 hover:decoration-signal-ink"
          >
            Why genuine parts matter
            <IconChevronRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
      <ul role="list" className="grid grid-cols-2 gap-px border-t border-line bg-line">
        <Item icon={<IconReceipt size={20} />} title="GST invoice">
          With every order
        </Item>
        <Item icon={<IconTruck size={20} />} title="Same-day dispatch">
          {/* Kept together: an en dash is a line-break opportunity ("Mon–" / "Sat"). */}
          Most orders, before <span className="whitespace-nowrap">2 PM</span> <span className="whitespace-nowrap">Mon–Sat</span>
        </Item>
        <Item icon={<IconCheckCircle size={20} />} title="Warranty">
          Seller and manufacturer
        </Item>
        <li className="bg-card">
          <Link
            href="/shipping-refund"
            prefetch={false}
            className="group flex h-full min-h-11 gap-2.5 p-3.5 transition-colors duration-150 hover:bg-paper"
          >
            <IconReturn size={20} className="mt-px shrink-0 text-signal-ink" />
            <span className="min-w-0 text-[13px] leading-[18px] text-ink-2">
              <span className="block text-[14px] font-semibold leading-5 text-ink">Shipping &amp; returns</span>
              <span className="inline-flex items-center gap-0.5 group-hover:text-ink">
                Read the policy
                <IconChevronRight size={14} />
              </span>
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
