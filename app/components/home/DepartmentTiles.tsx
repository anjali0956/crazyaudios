import Link from "next/link";
import { IconArrowRight, IconChip, IconGrid, IconSpeaker } from "@/app/components/icons";
import { ProductImage } from "@/app/components/ui/ProductImage";
import { cx } from "@/app/components/ui/cx";
import { formatNumber } from "@/lib/format";
import type { DepartmentTile } from "./home-data";

const FALLBACK_ICON = { semiconductors: IconChip, passives: IconGrid, modules: IconGrid, "speaker-drivers": IconSpeaker, more: IconGrid };

function TilePhotos({ tile }: { tile: DepartmentTile }) {
  if (!tile.photos.length) {
    const Icon = FALLBACK_ICON[tile.id];
    return (
      <span className="grid h-full w-full place-items-center rounded-chip bg-paper text-line-strong">
        <Icon size={36} strokeWidth={1.25} />
      </span>
    );
  }
  if (tile.wide) {
    const photo = tile.photos[0];
    return (
      <span className="relative block h-full w-full overflow-hidden rounded-chip bg-paper">
        <ProductImage src={photo.src} alt="" fill sizes="(min-width: 1024px) 240px, 45vw" className="object-cover" />
      </span>
    );
  }
  // Two photos on phones and desktop tiles, three on the wide two-column tablet tiles.
  return (
    <span
      className={cx(
        "grid h-full w-full gap-1.5",
        tile.photos.length === 1 ? "grid-cols-1" : "grid-cols-2",
        tile.photos.length > 2 && "sm:grid-cols-3 lg:grid-cols-2"
      )}
    >
      {tile.photos.map((photo, index) => (
        <span key={photo.src} className={cx("relative block h-full min-w-0", index === 2 && "hidden sm:block lg:hidden")}>
          <ProductImage src={photo.src} alt="" fill sizes="(min-width: 1024px) 120px, (min-width: 640px) 90px, 70px" className="object-contain brightness-[1.03]" />
        </span>
      ))}
    </span>
  );
}

/**
 * "Shop by department" tiles in the owner's order (spec §11.1): Semiconductors,
 * Passives & hardware, Modules & boards, Speaker drivers. Real product photos,
 * one-listing-per-part counts. Each tile is a single link.
 */
export function DepartmentTiles({ tiles }: { tiles: DepartmentTile[] }) {
  return (
    <ul role="list" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
      {tiles.map((tile) => (
        <li key={tile.id} className="min-w-0">
          <Link
            href={tile.href}
            className="group flex h-full flex-col rounded-card border border-line bg-card p-3 transition-colors duration-150 hover:border-line-strong sm:p-4 lg:p-5"
          >
            <span className="block h-[76px] sm:h-24 lg:h-[124px]">
              <TilePhotos tile={tile} />
            </span>
            <span className="mt-3 block text-[15px] font-bold leading-5 tracking-[-0.005em] text-ink [font-stretch:108%] lg:mt-4 lg:text-[17px] lg:leading-6">
              {tile.label}
            </span>
            <span className="mt-1 hidden text-[13px] leading-[18px] text-ink-2 sm:block">{tile.blurb}</span>
            <span className="mt-auto flex items-center justify-between gap-2 pt-2.5 lg:pt-3">
              <span className="font-mono text-[11px] font-medium uppercase leading-4 tracking-[0.1em] text-muted tabular lg:text-[12px]">
                {tile.count === null ? "Browse" : `${formatNumber(tile.count)} ${tile.noun}`}
              </span>
              <IconArrowRight
                size={16}
                className="shrink-0 text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-signal-ink"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
