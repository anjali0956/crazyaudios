"use client";

import { useEffect } from "react";
import { DepartmentLinks } from "./components/chrome/DepartmentLinks";
import { WhatsAppLink } from "./components/chrome/TrackedLink";
import { WHATSAPP_DISPLAY, WHATSAPP_HELP_URL } from "./components/chrome/links";
import { IconRefresh, IconWhatsApp } from "./components/icons";
import { Button, ButtonLink } from "./components/ui/Button";

/** Branded error boundary for every route below the root layout. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page-wrap flex-1 py-12 lg:py-20">
      <div className="mx-auto max-w-[680px]">
        <div className="flex flex-col items-center text-center">
          <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-signal-soft text-signal-ink">
            <IconRefresh size={26} />
          </span>
          <p className="type-kicker mt-6 text-signal-ink">Something went wrong</p>
          <h1 className="type-h1 mt-2 text-ink">This page didn’t load</h1>
          <p className="mt-3 max-w-[48ch] text-[16px] leading-6 text-ink-2">
            It’s on our side, not yours. Try again — your cart is saved on this device.
          </p>
          <div className="mt-7 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
            <Button variant="primary" size="lg" icon={<IconRefresh size={20} />} onClick={() => reset()}>
              Try again
            </Button>
            <ButtonLink href="/" variant="outline" size="lg">
              Go to the homepage
            </ButtonLink>
          </div>
          <WhatsAppLink
            href={WHATSAPP_HELP_URL}
            source="error_page"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold text-ink hover:text-signal-ink"
          >
            <IconWhatsApp size={18} className="text-whatsapp" />
            Still stuck? WhatsApp {WHATSAPP_DISPLAY}
          </WhatsAppLink>
          {error.digest ? <p className="mt-2 font-mono text-[12px] text-muted">Ref {error.digest}</p> : null}
        </div>

        <div className="mt-12 rounded-sheet border border-line bg-card p-5 sm:p-7">
          <h2 className="type-h3 text-ink">Browse departments</h2>
          <DepartmentLinks className="mt-5" headingLevel="h3" />
        </div>
      </div>
    </main>
  );
}
