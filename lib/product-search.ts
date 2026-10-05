// Loose product-name search for the header suggestions and the homepage grid.
// Builders type part numbers loosely ("lm3886", "TLO72", "2sc-5200",
// "tda 7294"), so matching ignores case, spaces and punctuation and treats the
// letter O and the digit 0 as the same character. The matching and ranking are
// the redesign's lib/search.ts, applied to the product name only (the original
// design has always searched names only).
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
const QUALITY_NOISE = new Set(
  ["original", "orignal", "orginal", "origional", "originals", "genuine", "genuin"].map(normalizeQuery)
);
const PART_NOISE = new Set(["ic", "ics"].map(normalizeQuery));

/**
 * Remove noise words from a query: "original"/"genuine" (and misspellings)
 * whenever another word remains, "ic" only next to a part number (a word
 * with a digit), so "amplifier ic" keeps its meaning.
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

type PreparedQuery = {
  /** The whole query, normalised ("tda 7294" -> "tda7294"). */
  compact: string;
  terms: string[];
  /** Lowercased with spaces removed but punctuation kept, for the tie-breaker. */
  literal: string;
};

function prepareQuery(query: unknown): PreparedQuery {
  const cleaned = stripQueryNoise(query);
  return {
    compact: normalizeQuery(cleaned),
    terms: queryTerms(cleaned),
    literal: cleaned.toLowerCase().replace(/[µμ]/g, "u").replace(/\s+/g, ""),
  };
}

/**
 * Score a product name against a query. 0 = no match. Higher is better:
 * name prefix (100) > a name word starts with it (90) > name contains it (80)
 * > every term starts a name word (75) > every term in the name (70).
 * An exact, punctuation-aware match adds 5 ("2.2uf" ranks 2.2uF above 22uF).
 */
function scoreName(name: unknown, query: PreparedQuery) {
  const { compact, terms, literal } = query;
  if (!compact) return 0;

  const raw = String(name ?? "");
  const normalized = normalizeQuery(raw);
  const words = raw.split(/[\s/,()–-]+/).map(normalizeQuery).filter(Boolean);
  const multi = terms.length > 1;

  let score = 0;
  if (normalized.startsWith(compact)) score = 100;
  else if (words.some((word) => word.startsWith(compact))) score = 90;
  else if (normalized.includes(compact)) score = 80;
  else if (multi && terms.every((term) => words.some((word) => word.startsWith(term)))) score = 75;
  else if (multi && terms.every((term) => normalized.includes(term))) score = 70;
  if (!score) return 0;

  const literalName = raw.toLowerCase().replace(/[µμ]/g, "u").replace(/\s+/g, "");
  return literal && literalName.includes(literal) ? score + 5 : score;
}

/**
 * True when the product name matches the query loosely. A query with nothing
 * searchable in it (empty, spaces, punctuation) matches every product.
 */
export function matchesProductName(name: unknown, query: unknown) {
  const prepared = prepareQuery(query);
  if (!prepared.compact) return true;
  return scoreName(name, prepared) > 0;
}

/**
 * Products whose name matches the query loosely, best match first. Equal
 * scores keep the order they were given in. An empty query returns nothing.
 */
export function searchProductsByName<T extends { name?: unknown }>(
  products: T[],
  query: unknown,
  limit?: number
): T[] {
  const prepared = prepareQuery(query);
  if (!prepared.compact) return [];

  const ranked = products
    .map((product, index) => ({ product, index, score: scoreName(product.name, prepared) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row) => row.product);

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}
