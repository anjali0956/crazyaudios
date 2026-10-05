import Link from "next/link";
import type { CSSProperties } from "react";
import { ProductImage } from "@/app/components/ui/ProductImage";
import type { PromoBanner } from "./promo-banners";

const FALLBACK_RATIO = 2;

/**
 * The admin's promo banners as image cards. Each card keeps the image's own
 * aspect ratio, so nothing is cropped. Side by side (tablet and up) their
 * widths follow those ratios, so both cards share one height.
 */
export function PromoBanners({ banners }: { banners: PromoBanner[] }) {
  if (!banners.length) return null;
  const sizes = banners.length > 1 ? "(min-width: 1200px) 560px, (min-width: 768px) 50vw, 100vw" : "(min-width: 1200px) 1136px, 100vw";
  return (
    <section aria-label="Offers" className="page-wrap pt-10 lg:pt-[72px]">
      <ul role="list" className="flex flex-col gap-3 md:flex-row md:gap-5">
        {banners.map((banner) => {
          const known = Boolean(banner.width && banner.height);
          const ratio = known ? (banner.width as number) / (banner.height as number) : FALLBACK_RATIO;
          const style = { "--banner-ratio": ratio.toFixed(4) } as CSSProperties;
          return (
            <li key={banner.src} style={style} className="aspect-[var(--banner-ratio)] min-w-0 md:flex-[var(--banner-ratio)_1_0%]">
              <Link
                href={banner.href}
                prefetch={false}
                aria-label={banner.label}
                className="relative block h-full overflow-hidden rounded-card border border-line bg-card transition-colors duration-150 hover:border-line-strong"
              >
                <ProductImage src={banner.src} alt="" fill sizes={sizes} className={known ? "object-cover" : "object-contain"} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
