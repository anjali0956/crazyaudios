import Link from "next/link";
import type { ReactNode } from "react";
import { WHATSAPP_HELP_URL } from "@/app/components/chrome/links";
import { WhatsAppLink } from "@/app/components/chrome/TrackedLink";

// Tiny markup for copy that is written once and used twice: rendered on the
// page (with links) and as plain text in JSON-LD. Supports [label](href) links
// and blank-line paragraph breaks, nothing else. The href "whatsapp" becomes a
// tracked WhatsApp chat link.
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** "Read [this](/why-genuine)." -> "Read this." (for JSON-LD answers). */
export function plainText(source: string) {
  return source
    .replace(LINK, "$1")
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

type LinkOptions = { whatsappSource: string; whatsappHref: string };

function renderInline(text: string, options: LinkOptions, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const [whole, label, href] = match;
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const key = `${keyPrefix}-${start}`;
    if (href === "whatsapp" || href.startsWith("https://wa.me/")) {
      // WhatsApp links always report the Meta "Contact" event.
      nodes.push(
        <WhatsAppLink key={key} href={href === "whatsapp" ? options.whatsappHref : href} source={options.whatsappSource}>
          {label}
        </WhatsAppLink>
      );
    } else if (href.startsWith("/")) {
      nodes.push(
        <Link key={key} href={href}>
          {label}
        </Link>
      );
    } else {
      nodes.push(
        <a key={key} href={href}>
          {label}
        </a>
      );
    }
    last = start + whole.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Renders the markup as paragraphs. Put it inside <Prose> for link and
 * paragraph styles.
 */
export function RichText({
  source,
  whatsappSource = "content_page",
  whatsappHref = WHATSAPP_HELP_URL,
}: {
  source: string;
  /** Meta Contact content_category for WhatsApp links in this text. */
  whatsappSource?: string;
  /** Chat link used for [label](whatsapp). */
  whatsappHref?: string;
}) {
  const paragraphs = source
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{renderInline(paragraph, { whatsappSource, whatsappHref }, `p${index}`)}</p>
      ))}
    </>
  );
}
