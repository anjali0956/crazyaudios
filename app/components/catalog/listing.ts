// Server-side listing helpers shared by category, department, search and home
// pages: URL params, filtering, ordering and one-listing-per-part dedupe.
import "server-only";
import {
  displayKey,
  parseSort,
  preferMostFaked,
  slugify,
  sortProducts,
  type CatalogProduct,
  type SortKey,
} from "@/lib/catalog";
import { isKnownWrongImage, withSafeImage } from "./images";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export type ListingParams = {
  sort: SortKey;
  inStock: boolean;
  /** Brand slug ("texas-instruments"), or null for all brands. */
  brand: string | null;
};

export function firstParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Toolbar state from the URL: ?sort=price-asc&instock=1&brand=onsemi */
export function readListingParams(searchParams: SearchParamsRecord): ListingParams {
  const brand = slugify(firstParam(searchParams.brand)).slice(0, 60);
  return {
    sort: parseSort(firstParam(searchParams.sort)),
    inStock: ["1", "true", "on", "yes"].includes(firstParam(searchParams.instock).toLowerCase()),
    brand: brand || null,
  };
}

/** Query string for a listing URL, omitting defaults: "" or "?sort=newest&instock=1". */
export function listingQuery(params: Partial<ListingParams>) {
  const query = new URLSearchParams();
  if (params.sort && params.sort !== "featured") query.set("sort", params.sort);
  if (params.inStock) query.set("instock", "1");
  if (params.brand) query.set("brand", params.brand);
  const value = query.toString();
  return value ? `?${value}` : "";
}

/** Buyable now: at least one pack in stock (pack items sell in multiples). */
export function isBuyable(product: Pick<CatalogProduct, "stock" | "minQty">) {
  return product.stock >= Math.max(1, product.minQty);
}

function hasUsablePhoto(product: Pick<CatalogProduct, "image">) {
  return Boolean(product.image) && !isKnownWrongImage(product.image);
}

/** a better listing than b for the same part: buyable, then a usable photo, then more stock, then newer. */
function betterListing(a: CatalogProduct, b: CatalogProduct) {
  if (isBuyable(a) !== isBuyable(b)) return isBuyable(a);
  if (hasUsablePhoto(a) !== hasUsablePhoto(b)) return hasUsablePhoto(a);
  if (a.stock !== b.stock) return a.stock > b.stock;
  return String(a.createdAt ?? "") > String(b.createdAt ?? "");
}

/**
 * One listing per part for mixed lists (departments, search, home rows), kept
 * at the position of its first listing. Like dedupeByDisplayName, but a
 * listing with a usable photo beats one whose photo is a known wrong photo.
 */
export function dedupeListings<T extends CatalogProduct>(products: T[]): T[] {
  const best = new Map<string, T>();
  for (const product of products) {
    const key = displayKey(product);
    const current = best.get(key);
    if (!current || betterListing(product, current)) best.set(key, product);
  }
  const seen = new Set<string>();
  const out: T[] = [];
  for (const product of products) {
    const key = displayKey(product);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(best.get(key) as T);
  }
  return out;
}

/**
 * Listing order. "featured" puts the most-searched originals first (spec §11:
 * 2SC5200 next to its complement 2SA1943 and so on), then the admin's
 * featured picks, then in-stock parts by part number; parts still waiting
 * for a right photo go last, so a listing never opens on a placeholder.
 */
export function orderListing<T extends CatalogProduct>(products: T[], sort: SortKey): T[] {
  if (sort !== "featured") return sortProducts(products, sort);
  const ordered = preferMostFaked(sortProducts(products, "featured"));
  return [...ordered.filter(hasUsablePhoto), ...ordered.filter((product) => !hasUsablePhoto(product))];
}

export type BrandFacet = { slug: string; label: string; count: number };

/** Brands present in a list, most listings first. Products without a known brand are left out. */
export function brandFacets(products: Pick<CatalogProduct, "brand">[]): BrandFacet[] {
  const counts = new Map<string, BrandFacet>();
  for (const product of products) {
    if (!product.brand) continue;
    const slug = slugify(product.brand);
    if (!slug) continue;
    const facet = counts.get(slug) ?? { slug, label: product.brand, count: 0 };
    facet.count += 1;
    counts.set(slug, facet);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Apply the toolbar to a list: brand (only if it is one of `facets`), in-stock
 * and sort. Known wrong photos are swapped for the placeholder.
 */
export function applyListing(products: CatalogProduct[], params: ListingParams, facets: BrandFacet[] = []) {
  const brand = params.brand && facets.some((facet) => facet.slug === params.brand) ? params.brand : null;
  const filtered = products.filter(
    (product) => (!brand || (product.brand && slugify(product.brand) === brand)) && (!params.inStock || isBuyable(product))
  );
  return { brand, products: orderListing(filtered, params.sort).map(withSafeImage) };
}
