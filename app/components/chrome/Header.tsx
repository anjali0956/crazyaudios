import Link from "next/link";
import { PRIMARY_NAV } from "@/lib/categories";
import { Logo } from "@/app/components/ui/Logo";
import { ANNOUNCEMENT } from "./links";
import {
  AccountButton,
  CartButton,
  ChromeProvider,
  HeaderSearchField,
  MenuButton,
  PrimaryNav,
  SearchButton,
  type NavDepartment,
} from "./HeaderClient";

/** Ink strip above the header: the core message plus shipping/COD facts. */
export function AnnouncementBar() {
  return (
    <div className="on-dark border-b border-white/[0.08] bg-ink text-white/80">
      <p className="page-wrap flex min-h-8 items-center justify-center py-1.5 text-center text-[13px] leading-[18px]">
        <span className="sm:hidden">{ANNOUNCEMENT.mobile}</span>
        <span className="hidden sm:inline">{ANNOUNCEMENT.desktop}</span>
      </p>
    </div>
  );
}

/**
 * Sticky ink header. Mobile: menu · logo · search · cart. Desktop: menu ·
 * logo · department links · search field (≥1280px, icon below) · account · cart.
 * Server-rendered; the buttons and sheets are small client islands.
 */
export function Header({ departments, countsLive }: { departments: NavDepartment[]; countsLive: boolean }) {
  return (
    <ChromeProvider departments={departments} countsLive={countsLive}>
      <header className="on-dark sticky top-0 z-40 bg-ink text-white">
        <div className="page-wrap flex h-14 items-center gap-0.5 !px-1.5 sm:!px-4 lg:h-16 lg:gap-1 lg:!px-6 xl:!px-8">
          <MenuButton />
          <Link
            href="/"
            aria-label="CrazyAudios home"
            className="flex min-h-11 min-w-0 shrink items-center rounded-chip px-1.5"
          >
            <Logo variant="on-dark" decorative className="h-[18px] max-w-full lg:h-[21px]" />
          </Link>
          <PrimaryNav items={PRIMARY_NAV} className="ml-4 hidden lg:block xl:ml-6" />
          <div className="min-w-2 flex-1" />
          <HeaderSearchField className="mr-2 hidden w-[clamp(220px,22vw,320px)] xl:block" />
          <div className="flex xl:hidden">
            <SearchButton />
          </div>
          {/* Wrapped: a utility's own display class would override "hidden". */}
          <div className="hidden lg:flex">
            <AccountButton />
          </div>
          <CartButton />
        </div>
      </header>
    </ChromeProvider>
  );
}
