import type { Metadata } from "next";
import { DepartmentTiles } from "@/app/components/home/DepartmentTiles";
import { getHomeData } from "@/app/components/home/home-data";
import { HomeHero } from "@/app/components/home/HomeHero";
import { HomeSection } from "@/app/components/home/HomeSection";
import { ModulesRow } from "@/app/components/home/ModulesRow";
import { PeerlessBand } from "@/app/components/home/PeerlessBand";
import { PromoBanners } from "@/app/components/home/PromoBanners";
import { getPromoBanners } from "@/app/components/home/promo-banners";
import { ServicePromises } from "@/app/components/home/ServicePromises";
import { WhyOriginal } from "@/app/components/home/WhyOriginal";
import { ProductGrid } from "@/app/components/ui/ProductGrid";
import { formatINR } from "@/lib/format";
import { COD_ENABLED, COD_MAX_ORDER_VALUE } from "@/lib/shipping-policy";
import { DEFAULT_OPEN_GRAPH } from "@/lib/site";

// Server-rendered home (spec §7 as overridden by §11/§14): components lead,
// Peerless is a secondary band. Regenerated at most once a minute from the
// cached catalogue; it falls back to a static page if the database is down.
export const revalidate = 60;

const HOME_DESCRIPTION = `Original amplifier ICs, transistors, op-amps, MOSFETs and capacitors, directly imported. GST invoice, same-day dispatch on most orders${
  COD_ENABLED ? `, COD up to ${formatINR(COD_MAX_ORDER_VALUE)}` : ""
}.`;

export const metadata: Metadata = {
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { ...DEFAULT_OPEN_GRAPH, url: "/", description: HOME_DESCRIPTION },
};

export default async function HomePage() {
  const [data, banners] = await Promise.all([getHomeData(), getPromoBanners()]);
  const modulesHref = data.tiles.find((tile) => tile.id === "modules")?.href ?? "/category/brainsaudios";

  return (
    <main className="flex-1">
      <HomeHero specimens={data.specimens} />

      <HomeSection id="home-departments" kicker="Shop by department" title="What are you building?">
        <DepartmentTiles tiles={data.tiles} />
      </HomeSection>

      {data.originals.length ? (
        <HomeSection
          id="home-originals"
          kicker="Directly imported"
          title="Most-searched originals"
          description="The part numbers most often counterfeited. Ours are directly imported, and we check every batch."
          link={{ href: "/category/semiconductors", label: "All semiconductors" }}
        >
          <ProductGrid products={data.originals} />
        </HomeSection>
      ) : null}

      <WhyOriginal />

      {data.speakers ? <PeerlessBand count={data.speakers.count} photos={data.speakers.photos} /> : null}

      <ModulesRow products={data.modules} href={modulesHref} />

      <PromoBanners banners={banners} />

      <ServicePromises />
    </main>
  );
}
