import type { ReactNode } from "react";
import { PageContents, type ContentsItem } from "@/app/components/content/PageContents";
import { Breadcrumbs, type Crumb } from "@/app/components/ui/Breadcrumbs";
import { cx } from "@/app/components/ui/cx";

type InfoPageShellProps = {
  /** The page's H1. */
  title: string;
  /** Lead paragraph under the H1. */
  subtitle?: ReactNode;
  /** Small mono label above the H1 ("Help", "Policies"). */
  kicker?: string;
  /** In-page anchor list for long pages: inline on phones, a sticky column on desktop. */
  contents?: ContentsItem[];
  /** Small print under the lead, e.g. "Updated October 2026". */
  meta?: ReactNode;
  /** Breadcrumb trail; defaults to Home / title. */
  crumbs?: Crumb[];
  /** The page's sections. */
  children: ReactNode;
};

/**
 * Calm reading layout for help, policy and account pages: breadcrumbs, a
 * kicker + H1 + lead header and a 720px column of sections. Long pages pass
 * `contents` for a numbered "On this page" list.
 */
export default function InfoPageShell({ title, subtitle, kicker, contents = [], meta, crumbs, children }: InfoPageShellProps) {
  const hasContents = contents.length > 0;

  return (
    <main className="page-wrap flex-1 pb-16 pt-1 lg:pb-24 lg:pt-3">
      <div className={cx("mx-auto", hasContents ? "max-w-[1040px]" : "max-w-[720px]")}>
        <Breadcrumbs items={crumbs ?? [{ label: "Home", href: "/" }, { label: title }]} />

        <div className={cx(hasContents && "lg:grid lg:grid-cols-[minmax(0,720px)_248px] lg:justify-between lg:gap-x-12")}>
          <div className="min-w-0">
            <header className="border-b border-line pb-7 pt-3 lg:pb-9 lg:pt-5">
              {kicker ? <p className="type-kicker text-signal-ink">{kicker}</p> : null}
              <h1 className={cx("type-h1 text-ink", kicker && "mt-2")}>{title}</h1>
              {subtitle ? (
                <p className="mt-3 max-w-[60ch] text-[17px] leading-[26px] text-ink-2 lg:mt-4 lg:text-[18px] lg:leading-[28px]">
                  {subtitle}
                </p>
              ) : null}
              {meta ? <p className="type-micro mt-4 font-mono uppercase tracking-[0.08em] text-muted">{meta}</p> : null}
            </header>

            {hasContents ? <PageContents items={contents} className="mt-6 lg:hidden" /> : null}

            <div className="mt-8 space-y-12 lg:mt-10 lg:space-y-14">{children}</div>
          </div>

          {hasContents ? (
            <aside className="hidden lg:block">
              <div className="sticky top-24 pt-5">
                <PageContents items={contents} />
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </main>
  );
}
