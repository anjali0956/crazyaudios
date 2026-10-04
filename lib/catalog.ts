// Server-side catalogue access for pages and route handlers.
// One cached read of the whole catalogue (109 products) backs every helper:
// pages stay fast, the database sees at most one query per minute.
import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  CATEGORY_GROUPS,
  categoryInfo,
  normalizeRawCategory,
  resolveCategory,
  resolveGroup,
  type CategoryGroup,
  type CategoryGroupId,
  type CategoryInfo,
} from "@/lib/categories";
import { brandOf, pricingOf } from "@/lib/format";
import { dedupeByDisplayName, displayKey, displayName } from "@/lib/display";
import { MOST_FAKED_PARTS, descriptorOf, matchesPart, preferMostFaked } from "@/lib/parts";

export * from "@/lib/categories";
export * from "@/lib/parts";
export * from "@/lib/display";
export { normalizeQuery, searchProducts, stripQueryNoise } from "@/lib/search";
export { brandOf, specsOf, pricingOf, partNumbersOf, formatINR } from "@/lib/format";

/** Seconds a cached catalogue read stays fresh. Pages use the same value. */
export const CATALOG_REVALIDATE = 60;

/** Plain, serialisable product (safe to pass to client components). */
export type CatalogProduct = {
  _id: string;
  /** Raw name as stored. Keep it for Meta Pixel / feed payloads; show displayName to customers. */
  name: string;
  /** Customer-facing name (spec §15): "LM 3886" -> "LM3886", "TLO72" -> "TL072". */
  displayName: string;
  /** Maker-independent descriptor from PART_INFO ("NPN audio power transistor"), or null. */
  descriptor: string | null;
  /** Stored GST-inclusive price per unit (the struck "MRP" when on sale). */
  price: number;
  image: string;
  extraImages: string[];
  description: string[];
  stock: number;
  /** Raw category as stored (lowercase). */
  category: string;
  weightGrams: number | null;
  packSize: number | null;
  featured: boolean;
  flashSale: boolean;
  discountPercentage: number;
  createdAt: string | null;
  updatedAt: string | null;
  // ---- derived, computed with lib/order-utils getDisplayPrice ----
  /** Customer price per unit. */
  displayPrice: number;
  /** Struck price per unit when a flash sale applies, else null. */
  mrp: number | null;
  /** Smallest sellable quantity (1, or the pack size). */
  minQty: number;
  /** Price of the smallest sellable quantity (unit price x pack). */
  sellPrice: number;
  /** Struck price for the smallest sellable quantity, else null. */
  sellMrp: number | null;
  onSale: boolean;
  /** Effective discount percent, 0 when not on sale. */
  discount: number;
  brand: string | null;
  categoryLabel: string;
  categorySlug: string;
  categoryGroup: CategoryGroupId;
  href: string;
};

type ProductDoc = {
  _id: unknown;
  name?: string;
  price?: number;
  image?: string;
  extraImages?: unknown[];
  description?: unknown[];
  stock?: number;
  category?: string;
  weightGrams?: number | null;
  packSize?: number | null;
  featured?: boolean;
  flashSale?: boolean;
  discountPercentage?: number;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

function isoOrNull(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanImage(value: unknown) {
  return String(value ?? "").trim();
}

/** Turn a lean Mongo document into a CatalogProduct. */
export function toCatalogProduct(doc: ProductDoc): CatalogProduct {
  const description = (Array.isArray(doc.description) ? doc.description : [])
    .map((line) => String(line ?? "").trim())
    .filter(Boolean);
  const base = {
    _id: String(doc._id),
    name: String(doc.name ?? "").trim(),
    price: Number(doc.price) || 0,
    image: cleanImage(doc.image),
    extraImages: (Array.isArray(doc.extraImages) ? doc.extraImages : []).map(cleanImage).filter(Boolean),
    description,
    stock: Math.floor(Number(doc.stock) || 0),
    category: normalizeRawCategory(doc.category),
    weightGrams: doc.weightGrams == null ? null : Number(doc.weightGrams) || null,
    packSize: doc.packSize == null ? null : Math.max(0, Math.floor(Number(doc.packSize) || 0)) || null,
    featured: Boolean(doc.featured),
    flashSale: Boolean(doc.flashSale),
    discountPercentage: Number(doc.discountPercentage) || 0,
    createdAt: isoOrNull(doc.createdAt),
    updatedAt: isoOrNull(doc.updatedAt),
  };
  const pricing = pricingOf(base);
  const info = categoryInfo(base.category);
  return {
    ...base,
    displayName: displayName(base),
    descriptor: descriptorOf(base),
    displayPrice: pricing.unitPrice,
    mrp: pricing.unitMrp,
    minQty: pricing.packSize,
    sellPrice: pricing.sellPrice,
    sellMrp: pricing.sellMrp,
    onSale: pricing.onSale,
    discount: pricing.discount,
    brand: brandOf(base),
    categoryLabel: info.label,
    categorySlug: info.slug,
    categoryGroup: info.group,
    href: `/product/${base._id}`,
  };
}

// lib/mongodb throws at import time when MONGODB_URI is missing; importing it
// lazily turns that into a rejected promise callers can handle.
async function loadModels() {
  const [{ default: dbConnect }, { default: Product }] = await Promise.all([
    import("@/lib/mongodb"),
    import("@/models/Product"),
  ]);
  await dbConnect();
  return { Product };
}

const readAllProducts = unstable_cache(
  async (): Promise<CatalogProduct[]> => {
    const { Product } = await loadModels();
    const docs = (await Product.find({}).sort({ createdAt: 1, _id: 1 }).lean()) as unknown as ProductDoc[];
    return docs.map(toCatalogProduct).filter((product) => product.name);
  },
  ["catalog:all:v1"],
  { revalidate: CATALOG_REVALIDATE, tags: ["products"] }
);

/** Every product, cached for 60 s. Throws if the database is unreachable. */
export const getAllProducts = cache(async (): Promise<CatalogProduct[]> => readAllProducts());

/**
 * One product by Mongo id (the /product/{id} URL). Looks in the cached
 * catalogue first and falls back to the database for products created in the
 * last minute. Returns null for unknown or malformed ids.
 */
export const getProduct = cache(async (id: string): Promise<CatalogProduct | null> => {
  const clean = String(id ?? "").trim();
  if (!/^[a-f0-9]{24}$/i.test(clean)) return null;
  const all = await getAllProducts();
  const hit = all.find((product) => product._id === clean);
  if (hit) return hit;
  const { Product } = await loadModels();
  const doc = (await Product.findById(clean).lean()) as unknown as ProductDoc | null;
  return doc ? toCatalogProduct(doc) : null;
});

export type SortKey = "featured" | "price-asc" | "price-desc" | "newest";

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];

export function parseSort(value: unknown): SortKey {
  return SORT_OPTIONS.some((option) => option.value === value) ? (value as SortKey) : "featured";
}

const byName = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/**
 * Sort a copy of `products`. "featured": featured first, in-stock before
 * out-of-stock, then natural name order (LM1875 before LM3886).
 * Price sorts use the displayed (pack-aware) price.
 */
export function sortProducts<T extends Pick<CatalogProduct, "featured" | "stock" | "name" | "sellPrice" | "createdAt">>(
  products: T[],
  sort: SortKey = "featured"
): T[] {
  const copy = [...products];
  const inStock = (p: T) => (p.stock > 0 ? 1 : 0);
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.sellPrice - b.sellPrice || byName.compare(a.name, b.name));
    case "price-desc":
      return copy.sort((a, b) => b.sellPrice - a.sellPrice || byName.compare(a.name, b.name));
    case "newest":
      return copy.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")) || byName.compare(a.name, b.name));
    default:
      return copy.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) || inStock(b) - inStock(a) || byName.compare(a.name, b.name)
      );
  }
}

/**
 * Featured products (admin "featured" flag): the most-faked parts first (spec
 * §11, in MOST_FAKED_PARTS order), then the rest in-stock first.
 */
export const getFeatured = cache(async (): Promise<CatalogProduct[]> => {
  const all = await getAllProducts();
  return preferMostFaked(dedupeByDisplayName(sortProducts(all.filter((product) => product.featured), "featured")));
});

/**
 * The most-counterfeited parts that are in the catalogue and in stock, in
 * MOST_FAKED_PARTS order (one listing per part), regardless of the featured
 * flag. For "originals" rows on the home page.
 */
export const getMostFakedProducts = cache(async (limit = 8): Promise<CatalogProduct[]> => {
  const inStock = sortProducts((await getAllProducts()).filter((product) => product.stock > 0));
  const picked: CatalogProduct[] = [];
  for (const part of MOST_FAKED_PARTS) {
    const hit = inStock.find((product) => matchesPart(product.name, part) && !picked.includes(product));
    if (hit) picked.push(hit);
    if (picked.length >= limit) break;
  }
  return picked;
});

export type CategoryWithCount = CategoryInfo & {
  count: number;
  inStock: number;
  /** A representative product photo (in-stock, featured first), or null. */
  image: string | null;
};

export type DepartmentGroup = Omit<CategoryGroup, "categories"> & {
  categories: CategoryWithCount[];
  count: number;
  /** Up to 3 product photos from different categories, for department tiles. */
  images: string[];
  href: string;
};

function representative(products: CatalogProduct[]) {
  return sortProducts(products, "featured").find((product) => product.image)?.image ?? null;
}

/** Group products into departments (only categories that have products). */
export function buildDepartments(products: CatalogProduct[]): DepartmentGroup[] {
  const byRaw = new Map<string, CatalogProduct[]>();
  for (const product of products) {
    if (!product.category) continue;
    const list = byRaw.get(product.category) ?? [];
    list.push(product);
    byRaw.set(product.category, list);
  }

  return CATEGORY_GROUPS.map((group) => {
    const raws =
      group.id === "more"
        ? [...byRaw.keys()]
            .filter((raw) => categoryInfo(raw).group === "more")
            .sort((a, b) => (byRaw.get(b)?.length ?? 0) - (byRaw.get(a)?.length ?? 0))
        : group.categories;
    const categories: CategoryWithCount[] = raws
      .filter((raw) => (byRaw.get(raw)?.length ?? 0) > 0)
      .map((raw) => {
        const list = byRaw.get(raw) ?? [];
        return {
          ...categoryInfo(raw),
          count: list.length,
          inStock: list.filter((product) => product.stock > 0).length,
          image: representative(list),
        };
      });
    const images = categories
      .map((category) => category.image)
      .filter((src): src is string => Boolean(src))
      .slice(0, 3);
    return {
      id: group.id,
      slug: group.slug,
      label: group.label,
      blurb: group.blurb,
      categories,
      count: categories.reduce((sum, category) => sum + category.count, 0),
      images,
      href: categories.length === 1 ? categories[0].href : `/category/${group.slug}`,
    };
  }).filter((group) => group.categories.length > 0);
}

/** Departments with product counts, for menus, footers and home tiles. Cached. */
export const getCategoriesWithCounts = cache(async (): Promise<DepartmentGroup[]> => {
  return buildDepartments(await getAllProducts());
});

/**
 * Departments for global chrome (header menu). Never throws: if the database
 * is unreachable it returns the static map without counts, so a database
 * outage cannot take down every page's layout.
 */
export async function getDepartmentsForNav(): Promise<{ groups: DepartmentGroup[]; live: boolean }> {
  try {
    return { groups: await getCategoriesWithCounts(), live: true };
  } catch (error) {
    console.error("catalog: department counts unavailable, using static map", error);
    const groups: DepartmentGroup[] = CATEGORY_GROUPS.filter((group) => group.categories.length > 0).map((group) => ({
      id: group.id,
      slug: group.slug,
      label: group.label,
      blurb: group.blurb,
      categories: group.categories.map((raw) => ({ ...categoryInfo(raw), count: 0, inStock: 0, image: null })),
      count: 0,
      images: [],
      href: group.categories.length === 1 ? categoryInfo(group.categories[0]).href : `/category/${group.slug}`,
    }));
    return { groups, live: false };
  }
}

/**
 * Products in one category, by slug, raw name or encoded raw name.
 * Returns null when the param matches no category (render notFound()).
 * Products come back in "featured" order; re-sort with sortProducts().
 */
export async function getProductsByCategory(
  slugOrRaw: string
): Promise<{ category: CategoryInfo; products: CatalogProduct[] } | null> {
  const all = await getAllProducts();
  const rawInDb = [...new Set(all.map((product) => product.category))];
  const category = resolveCategory(slugOrRaw, rawInDb);
  if (!category) return null;
  const products = sortProducts(
    all.filter((product) => product.category === category.raw),
    "featured"
  );
  if (!products.length && !category.known) return null;
  return { category, products };
}

/**
 * Products in a department group ("speaker-drivers", "passives", ...).
 * Returns null when the param is not a group slug.
 */
export async function getProductsByGroup(
  groupSlug: string
): Promise<{ group: DepartmentGroup; products: CatalogProduct[] } | null> {
  const match = resolveGroup(groupSlug);
  if (!match) return null;
  const all = await getAllProducts();
  const group = buildDepartments(all).find((department) => department.id === match.id);
  if (!group) return null;
  const raws = new Set(group.categories.map((category) => category.raw));
  return {
    group,
    // Department pages span categories, so one listing per part (spec §15).
    products: dedupeByDisplayName(
      sortProducts(
        all.filter((product) => raws.has(product.category)),
        "featured"
      )
    ),
  };
}

/**
 * Up to `limit` related products: same category first, then the same
 * department, in-stock and featured first, never the product itself.
 */
export async function getRelatedProducts(product: Pick<CatalogProduct, "_id" | "category" | "name">, limit = 8) {
  const all = await getAllProducts();
  const group = categoryInfo(product.category).group;
  const self = displayKey(product);
  const others = all.filter((candidate) => candidate._id !== product._id && displayKey(candidate) !== self);
  const same = sortProducts(others.filter((candidate) => candidate.category === product.category));
  const sameGroup = sortProducts(
    others.filter((candidate) => candidate.category !== product.category && candidate.categoryGroup === group)
  );
  return dedupeByDisplayName([...same, ...sameGroup]).slice(0, limit);
}

