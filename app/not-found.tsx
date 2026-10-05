import type { Metadata } from "next";
import { DepartmentLinks } from "./components/chrome/DepartmentLinks";
import { SearchForm } from "./components/chrome/SearchForm";
import { WhatsAppLink } from "./components/chrome/TrackedLink";
import { WHATSAPP_DISPLAY, WHATSAPP_HELP_URL } from "./components/chrome/links";
import { IconWhatsApp } from "./components/icons";
import { ButtonLink } from "./components/ui/Button";
import { LogoIcon } from "./components/ui/LogoMark";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="page-wrap flex-1 py-12 lg:py-20">
      <div className="mx-auto max-w-[680px]">
        <div className="flex flex-col items-center text-center">
          <LogoIcon className="h-14 w-14" decorative />
          <p className="type-kicker mt-6 text-signal-ink">Error 404 · Page not found</p>
          <h1 className="type-h1 mt-2 text-ink">We couldn’t find that page</h1>
          <p className="mt-3 max-w-[48ch] text-[16px] leading-6 text-ink-2">
            The link may be old or the part may have moved. Search by part number, or pick a department below.
          </p>
          <SearchForm className="mt-7 max-w-[520px]" />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[14px]">
            <ButtonLink href="/" variant="ghost" size="md" className="text-signal-ink">
              Back to the homepage
            </ButtonLink>
            <WhatsAppLink
              href={WHATSAPP_HELP_URL}
              source="not_found"
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-ink hover:text-signal-ink"
            >
              <IconWhatsApp size={18} className="text-whatsapp" />
              Ask us on WhatsApp · {WHATSAPP_DISPLAY}
            </WhatsAppLink>
          </div>
        </div>

        <div className="mt-12 rounded-sheet border border-line bg-card p-5 sm:p-7">
          <h2 className="type-h3 text-ink">Browse departments</h2>
          <DepartmentLinks className="mt-5" headingLevel="h3" />
        </div>
      </div>
    </main>
  );
}
