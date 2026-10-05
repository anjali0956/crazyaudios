import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

export type IconButtonVariant = "ghost" | "ghost-on-dark" | "outline" | "dark";

const BASE =
  "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card touch-manipulation " +
  "transition-[background-color,border-color,color] duration-150 ease-out disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: "text-ink hover:bg-ink/5 active:bg-ink/10",
  "ghost-on-dark": "text-white hover:bg-white/10 active:bg-white/15",
  outline: "border border-line-strong bg-card text-ink hover:border-ink",
  dark: "bg-ink text-white hover:bg-ink-2",
};

export function iconButtonClasses(variant: IconButtonVariant = "ghost", className?: string) {
  return cx(BASE, VARIANTS[variant], className);
}

type Shared = {
  /** Accessible name (required: the button shows only an icon). */
  label: string;
  variant?: IconButtonVariant;
  /** The icon, usually a 22–24px icon from app/components/icons. */
  children: ReactNode;
  /** Optional overlay such as a count badge (see <CountBadge>). */
  badge?: ReactNode;
};

export type IconButtonProps = Shared & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label">;

/**
 * 44x44 icon-only button.
 *
 *   <IconButton label="Open menu" variant="ghost-on-dark" onClick={open}><IconMenu /></IconButton>
 */
export function IconButton({ label, variant = "ghost", className, children, badge, type = "button", ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} className={iconButtonClasses(variant, className)} {...rest}>
      {children}
      {badge}
    </button>
  );
}

export type IconButtonLinkProps = Shared & Omit<ComponentProps<typeof Link>, "children" | "aria-label">;

/** 44x44 icon-only link (cart, account). */
export function IconButtonLink({ label, variant = "ghost", className, children, badge, ...rest }: IconButtonLinkProps) {
  return (
    <Link aria-label={label} className={iconButtonClasses(variant, className)} {...rest}>
      {children}
      {badge}
    </Link>
  );
}

/** Small signal count bubble for icon buttons (cart). Renders nothing for 0. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!count || count < 1) return null;
  return (
    <span
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute right-0.5 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-signal px-1",
        "text-[11px] font-bold leading-none text-ink tabular",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
