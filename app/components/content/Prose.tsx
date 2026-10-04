import type { ReactNode } from "react";
import { cx } from "@/app/components/ui/cx";

/**
 * Long-form text styles for policy and help pages: paragraphs, lists, links
 * and emphasis inside get a comfortable measure (about 65 characters) and
 * rhythm without per-element classes.
 *
 *   <Prose><p>…</p><ul><li>…</li></ul></Prose>
 */
export function Prose({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        "max-w-[65ch] text-[16px] leading-[26px] text-ink-2",
        "[&>*+*]:mt-4 [&>h3]:mt-7 [&>h3+*]:mt-2",
        "[&_h3]:text-[17px] [&_h3]:leading-[23px] [&_h3]:text-ink [&_h3]:[font-weight:750] [&_h3]:[font-stretch:112%]",
        "[&_strong]:font-semibold [&_strong]:text-ink",
        "[&_a]:font-medium [&_a]:text-signal-ink [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-[3px] [&_a:hover]:decoration-2",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-2 [&_li]:pl-1 [&_li]:marker:text-muted",
        className
      )}
    >
      {children}
    </div>
  );
}
