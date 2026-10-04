import type { Metadata } from "next";
import { DEFAULT_OPEN_GRAPH } from "@/lib/site";
import HomeClient from "./HomeClient";

// The storefront itself is a client component; this server wrapper only adds
// the homepage's canonical link and og:url for link previews.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...DEFAULT_OPEN_GRAPH, url: "/" },
};

export default function HomePage() {
  return <HomeClient />;
}
