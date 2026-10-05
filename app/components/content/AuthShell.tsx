import type { ReactNode } from "react";
import { LogoIcon } from "@/app/components/ui/LogoMark";

/**
 * Narrow, top-aligned card for the log-in and register forms. The form starts
 * near the top on phones, so the keyboard never hides the first field.
 */
export function AuthShell({
  title,
  subtitle,
  note,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Small print under the card. */
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="page-wrap flex-1 pb-16 pt-5 sm:pt-10 lg:pb-24 lg:pt-14">
      <div className="mx-auto w-full max-w-[440px]">
        <div className="rounded-sheet border border-line bg-card px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8">
          <LogoIcon className="h-10 w-10" decorative />
          <h1 className="type-h1 mt-5 text-ink">{title}</h1>
          {subtitle ? <p className="mt-2 text-[16px] leading-6 text-ink-2">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {note ? <p className="mt-5 px-1 text-[14px] leading-[21px] text-muted">{note}</p> : null}
      </div>
    </main>
  );
}
