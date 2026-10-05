// Checkout-only icons, drawn to the foundation set's rules (24px grid,
// 1.75px stroke, round caps). Decorative unless `title` is given.
import type { ReactNode, SVGProps } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number; title?: string };

function Svg({ size = 24, title, strokeWidth = 1.75, children, ...rest }: Props & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const IconLock = (p: Props) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8.25 10.5V7.75a3.75 3.75 0 0 1 7.5 0v2.75" />
  </Svg>
);

/** Phone with a tick: UPI / online payment. */
export const IconPhonePay = (p: Props) => (
  <Svg {...p}>
    <rect x="6.5" y="2.75" width="11" height="18.5" rx="2.25" />
    <path d="m9.5 12 1.75 1.75L14.75 10.25" />
    <path d="M10.75 18.25h2.5" />
  </Svg>
);
