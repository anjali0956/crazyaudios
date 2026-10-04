// Product photos that must not be shown, and real-but-poor photos kept out of
// curated rows. The wrong-photo list lives in lib/display.ts (shared with the
// product page); this module adds the listing-specific helpers. The database is
// never changed: once the owner re-uploads a photo the product gets a new image
// path and it shows again automatically.
import { normalizeImageSrc } from "@/app/components/ui/ProductImage";
import { KNOWN_WRONG_IMAGES, isKnownWrongImage } from "@/lib/display";

export { KNOWN_WRONG_IMAGES, isKnownWrongImage };

/**
 * Real but poor photos (a cropped web screenshot, a truncated upload). They
 * stay on category and search pages, but curated home rows pick other parts.
 */
export const POOR_IMAGES: string[] = [
  // TPA3255: screenshot of another site's gallery, with its arrows.
  "/api/uploads/6aa79700a98661e13eb9e1e4",
  // TIP147: 7 KB truncated JPEG; decodes blurry.
  "/api/uploads/6aa7c07ef83f032912b7573f",
];

const POOR = new Set(POOR_IMAGES);

/** True when the product has a photo that is right and good enough for curated rows. */
export function hasShowcasePhoto(product: { image: string }) {
  const src = normalizeImageSrc(product.image);
  return Boolean(src) && !isKnownWrongImage(src) && !POOR.has(src);
}

/** The product with its photo removed when it is a known wrong photo (renders the placeholder). */
export function withSafeImage<T extends { image: string }>(product: T): T {
  return isKnownWrongImage(product.image) ? { ...product, image: "" } : product;
}
