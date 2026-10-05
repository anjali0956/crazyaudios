// Product search shared by /api/search, the search page and any client-side
// filtering. Builders type part numbers loosely ("lm 3886", "TLO72",
// "2sc-5200"), so matching ignores case, spaces and punctuation and treats
// the letter O and the digit 0 as the same character.
import { brandOf } from "@/lib/format";
import { categoryLabel } from "@/lib/categories";
import { displayName } from "@/lib/display";
import { normalizeQuery } from "@/lib/normalize";

export { normalizeQuery };

/** Whitespace-separated terms, each normalised; empty terms removed. */
export function queryTerms(value: unknown) {
  return String(value ?? "")
    .split(/\s+/)
    .map(normalizeQuery)
    .filter(Boolean);
}

// Buyers looking for originals type "original tda7294" or "2sc5200 genuine".
// Those words (and "ic" next to a part number) say nothing about which part.
const QUALITY_NOISE = new Set(["original", "orignal", "orginal", "origional", "originals", "genuine", "genuin"].map(normalizeQuery));
const PART_NOISE = new Set(["ic", "ics"].map(normalizeQuery));

/**
 * Remove noise words from a query: "original"/"genuine" (and misspellings)
 * whenever another word remains, "ic" only next to a part number (a word
 * with a digit), so "amplifier ic" still means the category.
 */
export function stripQueryNoise(value: unknown) {
  const words = String(value ?? "").split(/\s+/).filter(Boolean);
  const hasPartNumber = words.some((word) => /\d/.test(word));
  const kept = words.filter((word) => {
    const term = normalizeQuery(word);
    if (QUALITY_NOISE.has(term)) return false;
    if (PART_NOISE.has(term)) return !hasPartNumber;
    return true;
  });
  return kept.length ? kept.join(" ") : words.join(" ");
}

export type SearchableProduct = {
  _id: string;
  name: string;
  category?: string;
  description?: string[] | null;
  stock?: number;
  featured?: boolean;
  brand?: string | null;
};

type Indexed<T> = {
  product: T;
  /** Lowercased names with single spaces, for an exact-substring tie-breaker ("2.2uf" vs "22uf"). */
  literal: string[];
  /** Raw name and display name, normalised (either may match). */
  names: string[];
  nameWords: string[];
  /** Brand and category fields, each normalised separately so matches never span two fields. */
  meta: string[];
  /** Description lines, normalised one by one. */
  description: string[];
};

function index<T extends SearchableProduct>(product: T): Indexed<T> {
  const brand = product.brand ?? brandOf(product) ?? "";
  const shown = displayName(product);
  return {
    product,
    literal: [product.name, shown].map((value) => String(value || "").toLowerCase().replace(/[µμ]/g, "u").replace(/\s+/g, "")),
    names: [...new Set([normalizeQuery(product.name), normalizeQuery(shown)])].filter(Boolean),
    nameWords: [...new Set(`${product.name} ${shown}`.split(/[\s/,()–-]+/).map(normalizeQuery).filter(Boolean))],
    meta: [brand, product.category || "", categoryLabel(product.category || "")].map(normalizeQuery).filter(Boolean),
    description: (product.description || []).map(normalizeQuery).filter(Boolean),
  };
}

const inAny = (fields: string[], term: string) => fields.some((field) => field.includes(term));

/**
 * Score one product against a query. 0 = no match. Higher is better:
 * name prefix (100) > a name word starts with it (90) > name contains (80)
 * > every term starts a name word (75) > every term in the name (70)
 * > brand/category (50) > every term across name/brand/category (40)
 * > description (20) > every term somewhere (15).
 */
function score<T extends SearchableProduct>(entry: Indexed<T>, compact: string, terms: string[]) {
  if (!compact) return 0;
  if (entry.names.some((name) => name.startsWith(compact))) return 100;
  if (entry.nameWords.some((word) => word.startsWith(compact))) return 90;
  if (inAny(entry.names, compact)) return 80;
  const multi = terms.length > 1;
  if (multi && terms.every((term) => entry.nameWords.some((word) => word.startsWith(term)))) return 75;
  if (multi && terms.every((term) => inAny(entry.names, term))) return 70;
  if (inAny(entry.meta, compact)) return 50;
  const fields = [...entry.names, ...entry.meta];
  if (multi && terms.every((term) => inAny(fields, term))) return 40;
  if (inAny(entry.description, compact)) return 20;
  if (multi && terms.every((term) => inAny([...fields, ...entry.description], term))) return 15;
  return 0;
}

/**
 * Rank products for a query. Ties go to in-stock, then featured, then the
 * shorter name (closest to the part number), then alphabetical.
 */
export function searchProducts<T extends SearchableProduct>(products: T[], query: string, limit?: number): T[] {
  const cleaned = stripQueryNoise(query);
  const compact = normalizeQuery(cleaned);
  const terms = queryTerms(cleaned);
  const literal = cleaned.toLowerCase().replace(/[µμ]/g, "u").replace(/\s+/g, "");
  if (!compact) return [];

  const ranked = products
    .map((product) => {
      const entry = index(product);
      const base = score(entry, compact, terms);
      // Exact (punctuation-aware) name match breaks ties: "2.2uf" ranks 2.2µF above 22µF.
      const bonus = base > 0 && literal && entry.literal.some((name) => name.includes(literal)) ? 5 : 0;
      return { product, score: base + bonus, nameLength: entry.names[entry.names.length - 1]?.length ?? 0 };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aStock = Number(a.product.stock) > 0 ? 1 : 0;
      const bStock = Number(b.product.stock) > 0 ? 1 : 0;
      if (bStock !== aStock) return bStock - aStock;
      const aFeat = a.product.featured ? 1 : 0;
      const bFeat = b.product.featured ? 1 : 0;
      if (bFeat !== aFeat) return bFeat - aFeat;
      if (a.nameLength !== b.nameLength) return a.nameLength - b.nameLength;
      return a.product.name.localeCompare(b.product.name);
    })
    .map((row) => row.product);

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}

/** Shape returned by GET /api/search. */
export type SearchSuggestion = {
  id: string;
  /** Customer-facing name (displayName). */
  name: string;
  /** PART_INFO descriptor ("Dual JFET-input op-amp"), or null. */
  descriptor: string | null;
  image: string;
  /** Price of the smallest sellable quantity (pack total for pack items), GST incl. */
  displayPrice: number;
  /** Struck price for the same quantity when on sale, else null. */
  mrp: number | null;
  /** 1 for single items, N for "pack of N" products. */
  packSize: number;
  stock: number;
  brand: string | null;
  categoryLabel: string;
  href: string;
};
