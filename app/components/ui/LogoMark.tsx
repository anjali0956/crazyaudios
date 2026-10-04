import { cx } from "./cx";

// CrazyAudios mark: an op-amp triangle with a small input sine entering it and
// leaving amplified. Geometry in "mark units" (the triangle is 28.4 tall).
// Kept apart from the wordmark so client components can show the mark
// without shipping the wordmark outlines.

/** Triangle (fill + 2.4 stroke, round joins). */
export const MARK_TRIANGLE = "M9 7L9 33L34 20Z";
/** Input sine outside the triangle (drawn in the wordmark colour). */
export const MARK_INPUT = "M0.3 17.4C1.2 17.4 1.98 18.67 2.8 20C3.62 21.33 4.4 22.6 5.3 22.6C6.2 22.6 6.98 21.33 7.8 20";
/** Amplified sine inside the triangle (always ink on signal). */
export const MARK_WAVE = "M7.8 20C8.86 17.23 9.87 14.6 11.05 14.6C12.23 14.6 13.24 17.23 14.3 20C15.36 22.77 16.37 25.4 17.55 25.4C18.73 25.4 19.74 22.77 20.8 20";
/** Self-contained wave for the square app icon. */
export const MARK_WAVE_CONTAINED = "M11.5 20C12.56 17.44 13.57 15 14.75 15C15.93 15 16.94 17.44 18 20C19.06 22.56 20.07 25 21.25 25C22.43 25 23.44 22.56 24.5 20";
export const MARK_VIEWBOX = "-1 5.8 36.2 28.4";

export const BRAND_SIGNAL = "#FF5A1F";
export const BRAND_INK = "#121416";

/** The three mark shapes; the input sine takes `inputColor` (the wordmark colour). */
export function MarkShapes({ inputColor }: { inputColor: string }) {
  return (
    <>
      <path d={MARK_INPUT} fill="none" stroke={inputColor} strokeWidth={2.6} strokeLinecap="round" />
      <path d={MARK_TRIANGLE} fill={BRAND_SIGNAL} stroke={BRAND_SIGNAL} strokeWidth={2.4} strokeLinejoin="round" />
      <path d={MARK_WAVE} fill="none" stroke={BRAND_INK} strokeWidth={2.6} strokeLinecap="round" />
    </>
  );
}

/**
 * The mark alone. The input sine uses currentColor, so set text-white on
 * dark surfaces and text-ink on light ones.
 *
 *   <LogoMark className="h-6 text-ink" decorative />
 */
export function LogoMark({ className, title = "CrazyAudios", decorative = false }: { className?: string; title?: string; decorative?: boolean }) {
  const a11y = decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": title };
  return (
    <svg viewBox={MARK_VIEWBOX} className={cx("block h-6 w-auto shrink-0", className)} {...a11y} focusable="false">
      <MarkShapes inputColor="currentColor" />
    </svg>
  );
}

/**
 * Square app icon: ink tile with the triangle and a contained wave
 * (favicon, apple-touch-icon, small avatars).
 */
export function LogoIcon({
  className,
  title = "CrazyAudios",
  rounded = true,
  decorative = false,
}: {
  className?: string;
  title?: string;
  rounded?: boolean;
  decorative?: boolean;
}) {
  const a11y = decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": title };
  return (
    <svg viewBox="0 0 64 64" className={cx("block h-10 w-10 shrink-0", className)} {...a11y} focusable="false">
      <rect width="64" height="64" rx={rounded ? 14 : 0} fill={BRAND_INK} />
      <g transform="translate(3.2 3) scale(1.45)">
        <path d={MARK_TRIANGLE} fill={BRAND_SIGNAL} stroke={BRAND_SIGNAL} strokeWidth={2.4} strokeLinejoin="round" />
        <path d={MARK_WAVE_CONTAINED} fill="none" stroke={BRAND_INK} strokeWidth={2.6} strokeLinecap="round" />
      </g>
    </svg>
  );
}
