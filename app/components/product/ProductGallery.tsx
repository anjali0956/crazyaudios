import type { ReactNode } from "react";
import { IconChip, IconSpeaker, IconWhatsApp } from "@/app/components/icons";
import { WhatsAppLink } from "@/app/components/chrome/TrackedLink";
import { Badge } from "@/app/components/ui/Badge";
import { ProductImage } from "@/app/components/ui/ProductImage";
import { cx } from "@/app/components/ui/cx";
import { GalleryCarousel } from "./GalleryCarousel";
import { FRAME, GALLERY_SIZES, PHOTO } from "./gallery-shared";

function SaleBadge({ label }: { label?: string | null }) {
  if (!label) return null;
  return (
    <Badge tone="signal" className="pointer-events-none absolute left-3 top-3 z-[2]">
      {label}
    </Badge>
  );
}

/**
 * "Photo coming soon" frame for products without a usable photo (spec §16:
 * known-wrong images), with a WhatsApp link to ask for real photos.
 */
function PhotoPlaceholder({
  alt,
  speaker,
  photosHref,
  contentName,
  children,
}: {
  alt: string;
  speaker: boolean;
  photosHref: string;
  contentName: string;
  children?: ReactNode;
}) {
  const Icon = speaker ? IconSpeaker : IconChip;
  return (
    <div className={cx(FRAME, "grid place-items-center bg-paper")}>
      <div role="img" aria-label={`${alt}: photo coming soon`} className="flex flex-col items-center px-6 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full border border-line-strong bg-card text-ink-2">
          <Icon size={30} strokeWidth={1.5} />
        </span>
        <p className="mt-4 text-[16px] font-semibold leading-6 text-ink">Photo coming soon</p>
      </div>
      <WhatsAppLink
        href={photosHref}
        source="product_page"
        contentName={contentName}
        className="absolute inset-x-0 bottom-5 mx-auto inline-flex min-h-11 w-max items-center gap-2 rounded-card px-3 text-[14px] font-semibold text-ok underline-offset-4 hover:underline"
      >
        <IconWhatsApp size={18} className="text-whatsapp" />
        Ask on WhatsApp for photos
      </WhatsAppLink>
      {children}
    </div>
  );
}

/**
 * Product photos: one photo renders as a static square (no client JS);
 * several become a swipeable carousel with thumbnails. The first photo is the
 * LCP element, so it loads with priority and the column's real `sizes`.
 */
export function ProductGallery({
  images,
  alt,
  saleLabel,
  speaker,
  photosHref,
  contentName,
}: {
  images: string[];
  /** Product display name (alt text). */
  alt: string;
  /** "Sale −10%" when a flash sale applies. */
  saleLabel?: string | null;
  /** Speaker-driver icon on the placeholder instead of the chip icon. */
  speaker: boolean;
  /** WhatsApp link that asks for photos (placeholder only). */
  photosHref: string;
  /** Raw product name for the Meta Contact event. */
  contentName: string;
}) {
  if (!images.length) {
    return (
      <PhotoPlaceholder alt={alt} speaker={speaker} photosHref={photosHref} contentName={contentName}>
        <SaleBadge label={saleLabel} />
      </PhotoPlaceholder>
    );
  }

  if (images.length === 1) {
    return (
      <div className={FRAME}>
        {/* LCP element. In Next 16 `priority` only preloads; fetchPriority must be set explicitly. */}
        <ProductImage src={images[0]} alt={alt} fill priority fetchPriority="high" sizes={GALLERY_SIZES} className={PHOTO} />
        <SaleBadge label={saleLabel} />
      </div>
    );
  }

  return <GalleryCarousel images={images} alt={alt} sizes={GALLERY_SIZES} badge={<SaleBadge label={saleLabel} />} />;
}
