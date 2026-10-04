// Data for the home page, picked from the cached catalogue on the server.
// Curated rows only use parts that are buyable now and have a right, decent
// photo, so the first impression never shows a placeholder or a wrong part.
import "server-only";
import {
  CATEGORY_GROUPS,
  MOST_FAKED_PARTS,
  categoryInfo,
  complementOf,
  getAllProducts,
  matchesPart,
  sortProducts,
  type CatalogProduct,
  type CategoryGroupId,
} from "@/lib/catalog";
import { unitNoun } from "@/app/components/catalog/copy";
import { hasShowcasePhoto, withSafeImage } from "@/app/components/catalog/images";
import { dedupeListings, isBuyable } from "@/app/components/catalog/listing";

export type TilePhoto = { src: string; alt: string };

export type DepartmentTile = {
  id: CategoryGroupId;
  label: string;
  href: string;
  blurb: string;
  /** Parts listed (one per part), or null when the catalogue is unavailable. */
  count: number | null;
  noun: string;
  photos: TilePhoto[];
  /** One landscape board photo instead of cut-out parts (modules). */
  wide: boolean;
};

export type HomeData = {
  /** False when the catalogue could not be read (static fallback page). */
  live: boolean;
  tiles: DepartmentTile[];
  /** "Most-searched originals" grid. */
  originals: CatalogProduct[];
  /** Desktop hero: four real parts. */
  specimens: CatalogProduct[];
  speakers: { count: number; photos: TilePhoto[] } | null;
  modules: CatalogProduct[];
};

type Pick = (product: CatalogProduct) => boolean;
const part = (number: string): Pick => (product) => matchesPart(product.name, number);
const inCategory = (raw: string, test: Pick = () => true): Pick => (product) => product.category === raw && test(product);

// Photos for the department tiles: recognisable, clean shots first.
const TILE_PICKS: Partial<Record<CategoryGroupId, Pick[]>> = {
  semiconductors: [part("TDA7294"), part("2SC5200"), part("NE5532")],
  passives: [
    inCategory("capacitor", (product) => /10000/.test(product.name)),
    inCategory("capacitor"),
    inCategory("connectors", (product) => /rca/i.test(product.name)),
  ],
  modules: [inCategory("brainsaudios", (product) => /input/i.test(product.name)), inCategory("brainsaudios")],
  "speaker-drivers": [
    inCategory("subwoofer", (product) => product.featured),
    inCategory("full range"),
    inCategory("tweeter", (product) => product.featured),
    inCategory("woofer"),
  ],
};

// Four different package shapes for the desktop hero (never LM3886: 1 in stock).
const HERO_PARTS = ["TDA7294", "2SC5200", "TIP35", "NE5532"];

const HOME_DEPARTMENTS: CategoryGroupId[] = ["semiconductors", "passives", "modules", "speaker-drivers"];

function photosFor(products: CatalogProduct[], picks: Pick[], limit: number): TilePhoto[] {
  const pool = sortProducts(products.filter(hasShowcasePhoto), "featured");
  const chosen: CatalogProduct[] = [];
  const used = new Set<string>();
  const add = (product: CatalogProduct | undefined) => {
    if (!product || used.has(product.image) || chosen.length >= limit) return;
    used.add(product.image);
    chosen.push(product);
  };
  for (const pick of picks) add(pool.find((product) => pick(product) && !used.has(product.image)));
  for (const product of pool) add(product);
  return chosen.map((product) => ({ src: product.image, alt: product.displayName }));
}

function buildTiles(all: CatalogProduct[]): DepartmentTile[] {
  return HOME_DEPARTMENTS.flatMap((id) => {
    const group = CATEGORY_GROUPS.find((entry) => entry.id === id);
    if (!group) return [];
    const products = all.filter((product) => product.categoryGroup === id);
    if (!products.length) return [];
    const raws = [...new Set(products.map((product) => product.category))];
    const count = dedupeListings(products).length;
    const wide = id === "modules";
    return [
      {
        id,
        label: group.label,
        href: raws.length === 1 ? `/category/${products[0].categorySlug}` : `/category/${group.slug}`,
        blurb: group.blurb,
        count,
        noun: unitNoun(id, count),
        photos: photosFor(products, TILE_PICKS[id] ?? [], wide ? 1 : 3),
        wide,
      },
    ];
  });
}

/** Static tiles (no counts, no photos) for when the catalogue is unavailable. */
function fallbackTiles(): DepartmentTile[] {
  return HOME_DEPARTMENTS.flatMap((id) => {
    const group = CATEGORY_GROUPS.find((entry) => entry.id === id);
    if (!group) return [];
    return [
      {
        id,
        label: group.label,
        href: group.categories.length === 1 ? categoryInfo(group.categories[0]).href : `/category/${group.slug}`,
        blurb: group.blurb,
        count: null,
        noun: unitNoun(id, 2),
        photos: [],
        wide: id === "modules",
      },
    ];
  });
}

/** Alternate two lists: a1, b1, a2, b2, … */
function alternate<T>(a: T[], b: T[]) {
  const out: T[] = [];
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if (a[index]) out.push(a[index]);
    if (b[index]) out.push(b[index]);
  }
  return out;
}

/** Take `size` items from each list in turn: a1 a2 b1 b2 a3 a4 … */
function interleave<T>(a: T[], b: T[], size: number) {
  const out: T[] = [];
  for (let index = 0; index < Math.max(a.length, b.length); index += size) {
    out.push(...a.slice(index, index + size), ...b.slice(index, index + size));
  }
  return out;
}

/**
 * "Most-searched originals" (spec §11.4): the most-faked parts that are
 * buyable now, one listing per part. Transistors come as complementary pairs
 * (2SC5200 + 2SA1943 share a row on phones), alternating with amplifier ICs
 * and op-amps; featured components top the grid up if needed.
 */
function pickOriginals(all: CatalogProduct[], limit = 8): CatalogProduct[] {
  const pool = sortProducts(all.filter((product) => isBuyable(product) && hasShowcasePhoto(product)), "featured");
  const used = new Set<string>();
  const take = (number: string) => {
    const hit = pool.find((product) => !used.has(product._id) && matchesPart(product.name, number));
    if (hit) used.add(hit._id);
    return hit ?? null;
  };
  const faked = dedupeListings(MOST_FAKED_PARTS.map(take).filter((product): product is CatalogProduct => Boolean(product)));

  const transistors = faked.filter((product) => product.category === "transistor");
  const paired = new Set<string>();
  const pairs: CatalogProduct[] = [];
  const singles: CatalogProduct[] = [];
  for (const product of transistors) {
    if (paired.has(product._id)) continue;
    const mate = complementOf(product, transistors);
    if (mate && !paired.has(mate._id)) {
      pairs.push(product, mate);
      paired.add(product._id).add(mate._id);
    } else {
      singles.push(product);
      paired.add(product._id);
    }
  }
  const featuredFirst = (list: CatalogProduct[]) => [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
  const ics = alternate(
    featuredFirst(faked.filter((product) => product.category === "amplifier ic")),
    featuredFirst(faked.filter((product) => product.category === "op-amplifiers"))
  );
  const picked = interleave([...pairs, ...singles], ics, 2);

  if (picked.length < limit) {
    const chosen = new Set(picked.map((product) => product._id));
    const extra = pool.filter(
      (product) =>
        !chosen.has(product._id) && (product.categoryGroup === "semiconductors" || product.categoryGroup === "passives")
    );
    picked.push(...dedupeListings(extra));
  }
  return dedupeListings(picked).slice(0, limit);
}

function pickSpecimens(all: CatalogProduct[], fallback: CatalogProduct[]) {
  const pool = all.filter((product) => isBuyable(product) && hasShowcasePhoto(product));
  const chosen: CatalogProduct[] = [];
  for (const number of HERO_PARTS) {
    const hit = sortProducts(pool.filter((product) => matchesPart(product.name, number)), "featured")[0];
    if (hit) chosen.push(hit);
  }
  for (const product of fallback) {
    if (chosen.length >= 4) break;
    if (!chosen.some((entry) => entry._id === product._id)) chosen.push(product);
  }
  return chosen.slice(0, 4);
}

export async function getHomeData(): Promise<HomeData> {
  try {
    const all = await getAllProducts();
    const originals = pickOriginals(all);
    const speakerProducts = all.filter((product) => product.categoryGroup === "speaker-drivers");
    return {
      live: true,
      tiles: buildTiles(all),
      originals,
      specimens: pickSpecimens(all, originals),
      speakers: speakerProducts.length
        ? {
            count: dedupeListings(speakerProducts).length,
            photos: photosFor(speakerProducts, TILE_PICKS["speaker-drivers"] ?? [], 3),
          }
        : null,
      modules: sortProducts(all.filter((product) => product.category === "brainsaudios"), "featured").map(withSafeImage),
    };
  } catch (error) {
    // The home page must render even if the database is down (and at build
    // time without one): fall back to static departments and no product rows.
    console.error("home: catalogue unavailable, rendering the static fallback", error);
    return { live: false, tiles: fallbackTiles(), originals: [], specimens: [], speakers: null, modules: [] };
  }
}
