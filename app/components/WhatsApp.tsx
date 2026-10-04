"use client";

import { usePathname } from "next/navigation";
import { trackPixelEvent } from "@/lib/meta-pixel";
import { whatsappLink } from "@/lib/site";

// Paths where a floating chat button would only get in the way: the admin,
// the cart and checkout (their sticky CTAs own the bottom of the screen) and the
// preview gate. Pages with a sticky bottom bar hide it via useBottomBar()
// (html[data-bottom-bar], see .ca-wa-float in globals.css).
const HIDE_FLOATING_ON = [/^\/admin(\/|$)/, /^\/checkout$/, /^\/cart$/, /^\/preview(\/|$)/];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

// Reported to Meta as a standard "Contact" event, so ads can count chats started.
function trackWhatsAppClick(source: string, contentName = "WhatsApp chat") {
  trackPixelEvent("Contact", { content_name: contentName, content_category: source });
}

export default function WhatsAppFloatingButton() {
  const pathname = usePathname() || "";
  if (HIDE_FLOATING_ON.some((pattern) => pattern.test(pathname))) return null;

  return (
    <a
      href={whatsappLink("Hi CrazyAudios, I have a question about a part.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with CrazyAudios on WhatsApp"
      onClick={() => trackWhatsAppClick("floating_button")}
      className="ca-wa-float fixed bottom-[calc(16px+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-whatsapp text-white shadow-raised transition-[opacity,transform,visibility] duration-200 ease-out hover:shadow-[inset_0_0_0_100px_rgb(18_20_22/0.08),0_1px_2px_rgb(18_20_22/0.06),0_10px_28px_-14px_rgb(18_20_22/0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink lg:bottom-6 lg:right-6"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
// The product page and contact page have their own WhatsApp links now
// (chrome/TrackedLink.tsx, same Contact payload); the old unused variants were
// removed so they no longer ship with every page.
