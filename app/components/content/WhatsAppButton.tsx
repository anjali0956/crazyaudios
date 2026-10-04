import type { ReactNode } from "react";
import { WHATSAPP_HELP_URL } from "@/app/components/chrome/links";
import { WhatsAppLink } from "@/app/components/chrome/TrackedLink";
import { IconWhatsApp } from "@/app/components/icons";
import { cx } from "@/app/components/ui/cx";

/**
 * Green WhatsApp chat button (ink text on #25D366, 9.8:1) that reports the
 * Meta "Contact" event via the foundation WhatsAppLink.
 */
export function WhatsAppButton({
  source,
  href = WHATSAPP_HELP_URL,
  size = "lg",
  fullWidth = false,
  className,
  children = "Chat on WhatsApp",
}: {
  /** Meta Contact content_category, e.g. "contact_page". */
  source: string;
  href?: string;
  size?: "md" | "lg";
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <WhatsAppLink
      href={href}
      source={source}
      className={cx(
        "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-card bg-whatsapp font-bold text-ink",
        "transition-shadow duration-150 hover:shadow-[inset_0_0_0_100px_rgb(18_20_22/0.08)] active:shadow-[inset_0_0_0_100px_rgb(18_20_22/0.14)]",
        size === "lg" ? "h-13 px-6 text-[16px]" : "h-11 px-4 text-[15px]",
        fullWidth && "w-full",
        className
      )}
    >
      <IconWhatsApp size={size === "lg" ? 22 : 20} />
      {children}
    </WhatsAppLink>
  );
}
