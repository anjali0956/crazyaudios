import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";
import MetaPixelPageView from "./components/MetaPixelPageView";
import AttributionCapture from "./components/AttributionCapture";
import WhatsAppFloatingButton from "./components/WhatsApp";
import { ChromeGate } from "./components/chrome/ChromeGate";
import { AnnouncementBar, Header } from "./components/chrome/Header";
import { Footer } from "./components/chrome/Footer";
import type { NavDepartment } from "./components/chrome/HeaderClient";
import { getDepartmentsForNav } from "@/lib/catalog";
import { META_PIXEL_ID } from "@/lib/meta-pixel";
import {
  DEFAULT_OPEN_GRAPH,
  FACEBOOK_DOMAIN_VERIFICATION,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";

// Archivo (variable weight + width) for everything; IBM Plex Mono for part
// numbers, specs and kickers. Self-hosted by next/font.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

// "₹" lives in Archivo's 86 KB latin-ext file; this 2 KB subset carries only
// that glyph (same variable axes) and is listed first in --font-sans.
const rupee = localFont({
  src: "./fonts/archivo-rupee.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-rupee",
  display: "swap",
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+20B9" },
    { prop: "font-stretch", value: "62% 125%" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: DEFAULT_OPEN_GRAPH,
  verification: {
    other: { "facebook-domain-verification": FACEBOOK_DOMAIN_VERIFICATION },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Android Chrome / in-app browsers tint their toolbar to match the header.
  themeColor: "#121416",
};

// The Pixel only loads in production builds, so `next dev` sessions on a
// developer's machine don't send PageViews from localhost into the ads dataset.
const LOAD_META_PIXEL = process.env.NODE_ENV === "production";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cached (60 s) and never throws: a database outage falls back to the static map.
  const { groups, live } = await getDepartmentsForNav();
  const departments: NavDepartment[] = groups.map((group) => ({
    id: group.id,
    label: group.label,
    href: group.href,
    count: group.count,
    categories: group.categories.map((category) => ({
      label: category.label,
      href: category.href,
      count: category.count,
    })),
  }));

  return (
    <html lang="en-IN" className={`${archivo.variable} ${plexMono.variable} ${rupee.variable}`}>
      <head>
        {LOAD_META_PIXEL ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
        </Script>
        ) : null}
      </head>
      <body className="flex min-h-screen flex-col bg-paper text-ink antialiased">
        {LOAD_META_PIXEL ? (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- Meta's no-JS pixel beacon */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        ) : null}
        <Providers>
          <ChromeGate>
            <a
              href="#content"
              className="sr-only z-[80] rounded-card bg-signal px-4 py-3 font-bold text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
            >
              Skip to content
            </a>
            <AnnouncementBar />
            <Header departments={departments} countsLive={live} />
          </ChromeGate>
          {/* Skip-link target. Deliberately an empty sibling, never a wrapper:
              wrapping {children} in a DOM element here lets React replay that
              element mid-hydration while page chunks load, which throws
              hydration error #418 (seen on ISR stale responses). */}
          <div id="content" tabIndex={-1} className="outline-none" />
          {children}
          <ChromeGate>
            <Footer />
          </ChromeGate>
        </Providers>
        <MetaPixelPageView />
        <AttributionCapture />
        <WhatsAppFloatingButton />
      </body>
    </html>
  );
}
