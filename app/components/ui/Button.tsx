import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "dark" | "outline" | "ghost" | "outline-on-dark" | "ghost-on-dark";
/** sm = 40px (dense cards), md = 44px (default), lg = 52px (primary page actions). */
export type ButtonSize = "sm" | "md" | "lg";

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Icon before the label (20px icons look right at md/lg). */
  icon?: ReactNode;
  /** Icon after the label. */
  iconRight?: ReactNode;
};

const BASE =
  "relative inline-flex items-center justify-center gap-2 rounded-card whitespace-nowrap select-none touch-manipulation " +
  "transition-[background-color,border-color,color,box-shadow] duration-150 ease-out " +
  "disabled:pointer-events-none aria-disabled:pointer-events-none";

// Hover/active darken with an ink overlay so every state stays on-token.
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-signal text-ink font-bold hover:shadow-[inset_0_0_0_100px_rgb(18_20_22/0.08)] active:shadow-[inset_0_0_0_100px_rgb(18_20_22/0.14)] " +
    "disabled:bg-line disabled:text-muted aria-disabled:bg-line aria-disabled:text-muted",
  dark:
    "bg-ink text-white font-semibold hover:bg-ink-2 active:bg-night " +
    "disabled:bg-line disabled:text-muted aria-disabled:bg-line aria-disabled:text-muted",
  outline:
    "border border-line-strong bg-card text-ink font-semibold hover:border-ink active:bg-paper " +
    "disabled:border-line disabled:text-muted aria-disabled:border-line aria-disabled:text-muted",
  ghost:
    "text-ink font-semibold hover:bg-ink/5 active:bg-ink/10 disabled:text-muted aria-disabled:text-muted",
  "outline-on-dark":
    "border border-white/35 text-white font-semibold hover:border-white hover:bg-white/5 active:bg-white/10 " +
    "disabled:border-white/15 disabled:text-white/40",
  "ghost-on-dark": "text-white font-semibold hover:bg-white/10 active:bg-white/15 disabled:text-white/40",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-3.5 text-[14px] leading-5",
  md: "h-11 px-4 text-[15px] leading-5",
  lg: "h-13 px-6 text-[16px] leading-6",
};

/** Class string for anything that should look like a button (e.g. a <label> or <summary>). */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}) {
  return cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  StyleProps & {
    /** Disables the button and announces it as busy. Shows `loadingText` if given. */
    loading?: boolean;
    loadingText?: string;
  };

/**
 * Action button. For navigation use <ButtonLink>; never put a button inside a link.
 *
 *   <Button variant="primary" size="lg" fullWidth icon={<IconBag size={20} />}>Add to cart</Button>
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  icon,
  iconRight,
  loading = false,
  loadingText,
  className,
  children,
  type = "button",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {icon && !loading ? <span className="-ml-0.5 inline-flex shrink-0">{icon}</span> : null}
      <span className={cx("truncate", loading && "opacity-80")}>{loading && loadingText ? loadingText : children}</span>
      {iconRight && !loading ? <span className="-mr-0.5 inline-flex shrink-0">{iconRight}</span> : null}
    </button>
  );
}

type LinkProps = Omit<ComponentProps<typeof Link>, "className" | "children">;

export type ButtonLinkProps = StyleProps &
  LinkProps & {
    className?: string;
    children: ReactNode;
  };

/**
 * A link styled as a button (internal routes via next/link).
 *
 *   <ButtonLink href="/category/amplifier-ics" size="lg">Shop amplifier ICs</ButtonLink>
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  icon,
  iconRight,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      {icon ? <span className="-ml-0.5 inline-flex shrink-0">{icon}</span> : null}
      <span className="truncate">{children}</span>
      {iconRight ? <span className="-mr-0.5 inline-flex shrink-0">{iconRight}</span> : null}
    </Link>
  );
}

export type ButtonAnchorProps = StyleProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    /** Opens in a new tab with rel="noopener noreferrer" (WhatsApp, mailto, PDFs). */
    external?: boolean;
  };

/** A plain <a> styled as a button, for external links (WhatsApp, mailto:, downloads). */
export function ButtonAnchor({
  variant = "outline",
  size = "md",
  fullWidth,
  icon,
  iconRight,
  external = false,
  className,
  children,
  ...rest
}: ButtonAnchorProps) {
  return (
    <a
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : null)}
      {...rest}
    >
      {icon ? <span className="-ml-0.5 inline-flex shrink-0">{icon}</span> : null}
      <span className="truncate">{children}</span>
      {iconRight ? <span className="-mr-0.5 inline-flex shrink-0">{iconRight}</span> : null}
    </a>
  );
}
