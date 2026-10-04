// Product photos that must not be shown (spec §16 plus a catalogue audit on
// 2026-10-05). Listings render the neutral photo placeholder instead. The
// database is never changed: once the owner re-uploads a photo the product
// gets a new image path and it shows again automatically.
import { normalizeImageSrc } from "@/app/components/ui/ProductImage";

/** Photos of a different product. Shown as the placeholder everywhere on listing pages. */
export const KNOWN_WRONG_IMAGES: string[] = [
  // Waveguide WG 148 R: byte-identical to /s8.jpg, an 18″ subwoofer (spec §16).
  "/pa11.jpg",
  // 2SA1941 (a TO-3P power transistor): the upload is "bc547.jpg", a TO-92 BC547.
  "/api/uploads/6a75f148ca973a917b218508",
  // "BC557B ON SEMI": the upload is "ksc1815.PNG", the KSC1815 photo ("C1815" marking).
  "/api/uploads/6aa576f623d8c48648526cd1",
];

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

const WRONG = new Set(KNOWN_WRONG_IMAGES);
const POOR = new Set(POOR_IMAGES);

/** True when the photo belongs to another product. */
export function isKnownWrongImage(src: unknown) {
  return WRONG.has(normalizeImageSrc(src));
}

/** True when the product has a photo that is right and good enough for curated rows. */
export function hasShowcasePhoto(product: { image: string }) {
  const src = normalizeImageSrc(product.image);
  return Boolean(src) && !WRONG.has(src) && !POOR.has(src);
}

/** The product with its photo removed when it is a known wrong photo (renders the placeholder). */
export function withSafeImage<T extends { image: string }>(product: T): T {
  return isKnownWrongImage(product.image) ? { ...product, image: "" } : product;
}
