import { ProductImage } from "@/app/components/ui/ProductImage";
import { cx } from "@/app/components/ui/cx";

// Product photos known to show a different product (DESIGN_SPEC §16): show the
// neutral placeholder instead.
const WRONG_IMAGES = new Set(["/pa11.jpg"]);

/** 48px product thumbnail for order lists (orders store the image path at purchase time). */
export function OrderItemThumb({ image, name, className }: { image?: string | null; name: string; className?: string }) {
  const src = image && !WRONG_IMAGES.has(image.trim()) ? image : null;
  return (
    <span className={cx("relative block h-12 w-12 shrink-0 overflow-hidden rounded-chip border border-line bg-card", className)}>
      <ProductImage src={src} alt={name} fill sizes="48px" className="object-contain p-1" placeholderClassName="[&>svg]:h-5 [&>svg]:w-5" />
    </span>
  );
}
