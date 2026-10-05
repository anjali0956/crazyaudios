// Navigation and support details shared by the header menu, footer and
// system pages. One place to change a link.
import { COD_ENABLED, COD_MAX_ORDER_VALUE, FREE_SHIPPING_THRESHOLD } from "@/lib/shipping-policy";
import { WHATSAPP_NUMBER, whatsappLink } from "@/lib/site";
import { formatINR } from "@/lib/format";

export type NavLink = { label: string; href: string; external?: boolean };

export const SUPPORT_EMAIL = "crazyaudios@gmail.com";
export const SUPPORT_HOURS = "Mon–Sat, 9:15 AM–6:15 PM";
export const WHY_GENUINE_HREF = "/why-genuine";

/** "917907570000" -> "+91 79075 70000". */
export function formatPhone(digits: string) {
  const clean = String(digits || "").replace(/\D/g, "");
  if (clean.length === 12 && clean.startsWith("91")) return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  return `+${clean}`;
}

export const WHATSAPP_DISPLAY = formatPhone(WHATSAPP_NUMBER);
export const WHATSAPP_HELP_URL = whatsappLink("Hi CrazyAudios, I have a question about a part.");

export const HELP_LINKS: NavLink[] = [
  { label: "Track your order", href: "/track-your-order" },
  { label: "Shipping & returns", href: "/shipping-refund" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact us", href: "/contact-us" },
];

export const COMPANY_LINKS: NavLink[] = [
  { label: "About us", href: "/about-us" },
  { label: "Why genuine?", href: WHY_GENUINE_HREF },
  { label: "Sell on CrazyAudios", href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Selling on CrazyAudios")}`, external: true },
];

export const LEGAL_LINKS: NavLink[] = [
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-of-service" },
];

/** Core message (spec §11), verbatim. */
export const CORE_MESSAGE = "Original parts, directly imported";

const freeShipping = FREE_SHIPPING_THRESHOLD > 0 ? `Free shipping over ${formatINR(FREE_SHIPPING_THRESHOLD)}` : "";

/** Announcement bar copy (spec §11.2). */
export const ANNOUNCEMENT = {
  mobile: [CORE_MESSAGE, COD_ENABLED ? "COD available" : freeShipping].filter(Boolean).join(" · "),
  desktop: [CORE_MESSAGE, freeShipping, COD_ENABLED ? `COD up to ${formatINR(COD_MAX_ORDER_VALUE)}` : ""].filter(Boolean).join(" · "),
};

/** "UPI · Cards · Netbanking · Cash on Delivery (up to ₹5,000)" */
export const PAYMENT_METHODS = ["UPI", "Cards", "Netbanking", COD_ENABLED ? `Cash on Delivery (up to ${formatINR(COD_MAX_ORDER_VALUE)})` : ""]
  .filter(Boolean)
  .join(" · ");
