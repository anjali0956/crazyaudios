import { IconPlus } from "@/app/components/icons";
import { cx } from "@/app/components/ui/cx";
import { Prose } from "./Prose";
import { RichText, plainText } from "./RichText";

/** `answer` uses RichText markup: [label](href) links, blank-line paragraphs. */
export type FaqEntry = { id?: string; question: string; answer: string };

/**
 * FAQ accordion on native <details>/<summary>: keyboard and screen-reader
 * accessible without JavaScript, and every answer is in the HTML for search
 * engines and find-in-page.
 */
export function FaqList({
  items,
  whatsappSource = "faq",
  whatsappHref,
  className,
}: {
  items: FaqEntry[];
  /** Meta Contact content_category for WhatsApp links inside answers. */
  whatsappSource?: string;
  whatsappHref?: string;
  className?: string;
}) {
  return (
    <div className={cx("rounded-card border border-line bg-card", className)}>
      {items.map((item, index) => (
        <details
          key={item.question}
          id={item.id}
          className={cx("group", index > 0 && "border-t border-line")}
        >
          <summary className="flex min-h-14 list-none items-center justify-between gap-4 rounded-card px-4 py-3.5 text-[16px] font-semibold leading-[22px] text-ink transition-colors duration-150 hover:text-signal-ink sm:px-5 [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            <span
              aria-hidden="true"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-strong text-ink-2 transition-[transform,background-color,border-color,color] duration-200 ease-out group-open:rotate-45 group-open:border-ink group-open:bg-ink group-open:text-white motion-reduce:transition-none"
            >
              <IconPlus size={16} strokeWidth={2} />
            </span>
          </summary>
          <Prose className="px-4 pb-5 sm:px-5 [&>p]:text-[15px] [&>p]:leading-[24px]">
            <RichText source={item.answer} whatsappSource={whatsappSource} whatsappHref={whatsappHref} />
          </Prose>
        </details>
      ))}
    </div>
  );
}

/** schema.org FAQPage for the given entries (plain-text answers). */
export function faqPageJsonLd(items: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: plainText(item.answer) },
    })),
  };
}
