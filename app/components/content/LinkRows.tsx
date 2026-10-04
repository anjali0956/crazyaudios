import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowRight } from "@/app/components/icons";
import { cx } from "@/app/components/ui/cx";

export type LinkRow = { href: string; label: string; description?: string; icon?: ReactNode };

/** A bordered list of arrow links ("Related pages", "Need something else?"). */
export function LinkRows({ links, className, label }: { links: LinkRow[]; className?: string; label?: string }) {
  return (
    <nav aria-label={label} className={cx("rounded-card border border-line bg-card", className)}>
      <ul>
        {links.map((link, index) => (
          <li key={link.href} className={cx(index > 0 && "border-t border-line")}>
            <Link
              href={link.href}
              className="group flex min-h-14 items-center gap-3 rounded-card px-4 py-3 transition-colors duration-150 hover:bg-paper sm:px-5"
            >
              {link.icon ? (
                <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-ink-2">
                  {link.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-5 text-ink">{link.label}</span>
                {link.description ? (
                  <span className="mt-0.5 block text-[14px] leading-5 text-muted">{link.description}</span>
                ) : null}
              </span>
              <IconArrowRight
                size={18}
                className="shrink-0 text-ink-2 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-signal-ink"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
