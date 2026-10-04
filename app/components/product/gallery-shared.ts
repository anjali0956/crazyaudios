// Shared by the server gallery wrapper and the client carousel.

/**
 * Rendered width of the gallery column: the page minus its gutters on phones
 * and tablets, half the 1200px container (minus the column gap) from 1024px.
 */
export const GALLERY_SIZES =
  "(min-width: 1200px) 544px, (min-width: 1024px) calc(50vw - 56px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)";

/** The square photo frame (single photo, carousel and placeholder). */
export const FRAME = "relative aspect-square overflow-hidden rounded-card border border-line bg-card";

/** Inner padding of product photos (the normalised photos are already trimmed). */
export const PHOTO = "object-contain p-[7%]";
