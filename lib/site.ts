export const SITE_NAME = "CrazyAudios";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.crazyaudios.com").replace(
  /\/+$/,
  ""
);

export function absoluteUrl(pathOrUrl: string) {
  const value = String(pathOrUrl || "").trim();
  if (!value) return SITE_URL;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

export const SITE_TITLE = `${SITE_NAME} – Genuine Audio ICs, Transistors & Speaker Drivers`;

export const SITE_DESCRIPTION =
  "Genuine CA Certified amplifier ICs, transistors and Peerless speaker drivers for DIY audio builders in India. Prices include GST, same-day dispatch on most orders.";

// Shared link-preview defaults. A page that sets its own openGraph replaces the
// whole object, so pages spread this and add their own url.
export const DEFAULT_OPEN_GRAPH = {
  type: "website" as const,
  siteName: SITE_NAME,
  locale: "en_IN",
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // 1200x630 (the size WhatsApp/Facebook previews expect), the CrazyAudios logo
  // without the "Meta AI" watermark that /crazy-audios-logo.jpg carries.
  images: [{ url: "/crazyaudios-share.jpg", width: 1200, height: 630, alt: SITE_NAME }],
};

// Meta Business Suite → Brand safety → Domains → crazyaudios.com (meta-tag method).
export const FACEBOOK_DOMAIN_VERIFICATION = "x4rqaf6ittig70qbdjxtqasxryc0kw";

// WhatsApp Business number for chat links: digits only, with country code.
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "917907570000").replace(
  /\D/g,
  ""
);

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
