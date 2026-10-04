import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Centered empty/zero-result state: icon, title, text and an action.
 *
 *   <EmptyState icon={<IconBag />} title="Your cart is empty" description="Parts you add appear here."
 *     action={<ButtonLink href="/category/amplifier-ics">Shop amplifier ICs</ButtonLink>} />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  as: Heading = "h2",
  className,
  children,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
  /** Extra content under the action (e.g. department links). */
  children?: ReactNode;
}) {
  return (
    <div className={cx("mx-auto flex max-w-md flex-col items-center px-4 py-12 text-center", className)}>
      {icon ? (
        <span aria-hidden="true" className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-signal-soft text-signal-ink">
          {icon}
        </span>
      ) : null}
      <Heading className={Heading === "h1" ? "type-h1 text-ink" : "type-h3 text-ink"}>{title}</Heading>
      {description ? <p className="mt-2 text-[15px] leading-[22px] text-ink-2">{description}</p> : null}
      {action ? <div className="mt-6 flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">{action}</div> : null}
      {children ? <div className="mt-8 w-full">{children}</div> : null}
    </div>
  );
}
