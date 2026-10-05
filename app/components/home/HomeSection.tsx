import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowRight } from "@/app/components/icons";
import { ButtonLink } from "@/app/components/ui/Button";
import { cx } from "@/app/components/ui/cx";

/**
 * Section wrapper for the home page: kicker, h2 and optional description, with
 * the "view all" link at the top right on wider screens and as a full-width
 * button under the content on phones (where it would crowd the heading).
 */
export function HomeSection({
  id,
  kicker,
  title,
  description,
  link,
  className,
  children,
}: {
  id: string;
  kicker?: string;
  title: string;
  description?: ReactNode;
  link?: { href: string; label: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cx("page-wrap pt-10 lg:pt-[72px]", className)}>
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          {kicker ? <p className="type-kicker text-signal-ink">{kicker}</p> : null}
          <h2 id={id} className={cx("type-h2 text-ink", kicker && "mt-1.5")}>
            {title}
          </h2>
          {description ? <p className="mt-2 max-w-[60ch] text-[15px] leading-[22px] text-ink-2">{description}</p> : null}
        </div>
        {link ? (
          <Link
            href={link.href}
            className="group -mr-2 hidden min-h-11 shrink-0 items-center gap-1.5 rounded-chip px-2 text-[14px] font-semibold text-ink hover:text-signal-ink sm:inline-flex"
          >
            {link.label}
            <IconArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>
      <div className="mt-4 lg:mt-6">{children}</div>
      {link ? (
        // Wrapped: the button's own display class would beat a "hidden" passed to it.
        <div className="mt-4 sm:hidden">
          <ButtonLink href={link.href} variant="outline" fullWidth iconRight={<IconArrowRight size={18} />}>
            {link.label}
          </ButtonLink>
        </div>
      ) : null}
    </section>
  );
}
