import Image, { type ImageProps } from "next/image";
import { SITE_URL } from "@/lib/site";
import { cx } from "./cx";

/**
 * Normalise a stored product image path for next/image: trims, makes our own
 * absolute URLs relative (so they are optimised locally), adds a leading "/".
 * Returns "" when there is no usable image.
 */
export function normalizeImageSrc(src: unknown) {
  const value = String(src ?? "").trim();
  if (!value) return "";
  const own = SITE_URL.replace(/^https?:\/\/(www\.)?/i, "");
  const ownPattern = new RegExp(`^https?://(www\\.)?${own.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
  if (ownPattern.test(value)) return value.replace(ownPattern, "") || "/";
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("/")) return value;
  return `/${value}`;
}

export type ProductImageProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  /** Use the product name. */
  alt: string;
  /** Classes for the empty-state placeholder. */
  placeholderClassName?: string;
};

/**
 * next/image for product photos. Local paths (/LM3886.jpg, /api/uploads/<id>)
 * go through the optimiser (AVIF/WebP, resized); off-site URLs are shown as-is
 * because the optimiser only fetches from this site. Missing images render a
 * neutral placeholder instead of a broken icon.
 *
 *   <div className="relative aspect-square"><ProductImage src={p.image} alt={p.name} fill sizes="46vw" className="object-contain p-[10%]" /></div>
 */
export function ProductImage({ src, alt, placeholderClassName, className, fetchPriority, ...rest }: ProductImageProps) {
  const clean = normalizeImageSrc(src);
  if (!clean) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={cx("absolute inset-0 grid place-items-center bg-paper text-line-strong", placeholderClassName)}
      >
        <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <rect x="6.75" y="6.75" width="10.5" height="10.5" rx="1.5" />
          <path d="M9.5 3.5v3.25M14.5 3.5v3.25M9.5 17.25v3.25M14.5 17.25v3.25M3.5 9.5h3.25M3.5 14.5h3.25M17.25 9.5h3.25M17.25 14.5h3.25" />
        </svg>
      </span>
    );
  }
  const remote = /^(https?:)?\/\//i.test(clean);
  // Next 16: `priority`/`preload` only preload and load eagerly; an above-the-fold
  // photo also needs fetchpriority="high" (on the <img> and its preload link).
  const priorityHint = fetchPriority ?? (rest.priority || rest.preload ? "high" : undefined);
  return <Image {...rest} fetchPriority={priorityHint} src={clean} alt={alt} className={className} unoptimized={remote || rest.unoptimized} />;
}
