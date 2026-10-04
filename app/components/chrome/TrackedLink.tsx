"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackPixelEvent } from "@/lib/meta-pixel";

/**
 * External WhatsApp link that reports a Meta "Contact" event, with the same
 * parameters as app/components/WhatsApp.tsx (content_category = where).
 */
export function WhatsAppLink({
  href,
  source,
  contentName = "WhatsApp chat",
  children,
  ...rest
}: { href: string; source: string; contentName?: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackPixelEvent("Contact", { content_name: contentName, content_category: source })}
      {...rest}
    >
      {children}
    </a>
  );
}
