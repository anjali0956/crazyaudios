import { SUPPORT_EMAIL, SUPPORT_HOURS, WHATSAPP_DISPLAY } from "@/app/components/chrome/links";
import { IconMail } from "@/app/components/icons";
import { ButtonAnchor } from "@/app/components/ui/Button";
import { cx } from "@/app/components/ui/cx";
import { WhatsAppButton } from "./WhatsAppButton";

/** "Still have a question?" card: WhatsApp (tracked) + email, with support hours. */
export function HelpCta({
  source,
  title = "Need a hand?",
  text,
  href,
  className,
}: {
  /** Meta Contact content_category for the WhatsApp button. */
  source: string;
  title?: string;
  text?: string;
  /** WhatsApp chat link (defaults to the general help message). */
  href?: string;
  className?: string;
}) {
  return (
    <section aria-labelledby={`help-${source}`} className={cx("rounded-sheet border border-line bg-card p-5 sm:p-7", className)}>
      <h2 id={`help-${source}`} className="type-h3 text-ink">
        {title}
      </h2>
      <p className="mt-2 max-w-[56ch] text-[15px] leading-[23px] text-ink-2">
        {text ?? `Message us on WhatsApp at ${WHATSAPP_DISPLAY} (messages only), ${SUPPORT_HOURS}. Or email us any time.`}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <WhatsAppButton source={source} href={href} size="lg" fullWidth className="sm:w-auto" />
        <ButtonAnchor
          href={`mailto:${SUPPORT_EMAIL}`}
          variant="outline"
          size="lg"
          fullWidth
          className="sm:w-auto"
          icon={<IconMail size={20} />}
        >
          Email us
        </ButtonAnchor>
      </div>
    </section>
  );
}
