import { IconArrowRight } from "@/app/components/icons";
import { ButtonLink } from "@/app/components/ui/Button";
import { ProductImage } from "@/app/components/ui/ProductImage";
import { formatNumber } from "@/lib/format";
import type { TilePhoto } from "./home-data";

/**
 * Peerless by Tymphany band (spec §11.1): deliberately secondary — a compact
 * white card below the component sections, linking to the speaker drivers
 * department.
 */
export function PeerlessBand({ count, photos }: { count: number; photos: TilePhoto[] }) {
  return (
    <section aria-labelledby="home-peerless" className="page-wrap pt-10 lg:pt-[72px]">
      <div className="grid items-center gap-x-10 gap-y-4 rounded-sheet border border-line bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-10 lg:py-8">
        <div className="min-w-0">
          <p className="type-kicker text-muted">Speaker drivers</p>
          <h2 id="home-peerless" className="type-h3 mt-1.5 text-ink lg:text-[21px] lg:leading-[26px]">
            Peerless by Tymphany speaker drivers
          </h2>
          <p className="mt-1.5 max-w-[52ch] text-[15px] leading-[22px] text-ink-2">
            Woofers, subwoofers, full-range drivers, tweeters and pro-audio drivers: {formatNumber(count)} models, each with a GST
            invoice.
          </p>
        </div>
        {photos.length ? (
          <ul role="list" className="flex gap-2 lg:row-span-2 lg:gap-4" aria-hidden="true">
            {photos.map((photo) => (
              <li key={photo.src} className="relative h-[84px] w-[84px] shrink-0 sm:h-24 sm:w-24 lg:h-[132px] lg:w-[132px]">
                <ProductImage src={photo.src} alt="" fill sizes="(min-width: 1024px) 132px, 96px" className="object-contain" />
              </li>
            ))}
          </ul>
        ) : null}
        <div>
          <ButtonLink href="/category/speaker-drivers" variant="outline" iconRight={<IconArrowRight size={18} />}>
            Shop speaker drivers
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
