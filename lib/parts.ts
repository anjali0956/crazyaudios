// Part-number knowledge for the owner's ad focus (spec §11, §15): which parts
// are most counterfeited, what each well-known part is, and which parts are
// complementary pairs. Client-safe. Matching uses the search normalisation,
// so the catalogue's "TLO72" counts as TL072.
import { normalizeQuery } from "@/lib/normalize";

export type PartInfo = {
  /** Display form of the part number. */
  part: string;
  /** Maker-independent description shown under the part number. */
  descriptor: string;
  /** Normalised key of the complementary part, if any. */
  complement?: string;
};

// Spec §15: only these well-known, maker-independent facts. Key = normalised part number.
const PART_LIST: Array<[string, string, string?]> = [
  ["2SC5200", "NPN audio power transistor", "2SA1943"],
  ["2SA1943", "PNP audio power transistor", "2SC5200"],
  ["2SC5198", "NPN audio power transistor", "2SA1941"],
  ["2SA1941", "PNP audio power transistor", "2SC5198"],
  ["TIP35", "NPN power transistor", "TIP36"],
  ["TIP36", "PNP power transistor", "TIP35"],
  ["TIP142", "NPN Darlington power transistor", "TIP147"],
  ["TIP147", "PNP Darlington power transistor", "TIP142"],
  ["TIP122", "NPN Darlington transistor", "TIP127"],
  ["TIP127", "PNP Darlington transistor", "TIP122"],
  ["2N3055", "NPN power transistor"],
  ["MJ21194", "NPN audio power transistor"],
  ["BD139", "NPN medium-power transistor", "BD140"],
  ["BD140", "PNP medium-power transistor", "BD139"],
  ["BC547", "NPN small-signal transistor", "BC557"],
  ["BC557", "PNP small-signal transistor", "BC547"],
  ["2N5551", "NPN high-voltage transistor", "2N5401"],
  ["2N5401", "PNP high-voltage transistor", "2N5551"],
  ["KSC1815", "NPN small-signal transistor"],
  ["TDA7294", "100 W DMOS audio amplifier IC"],
  ["TDA7293", "100 W DMOS audio amplifier IC (parallel-capable)"],
  ["LM3886", "68 W audio power amplifier IC"],
  ["LM1875", "20 W audio power amplifier IC"],
  ["TPA3255", "315 W stereo class-D amplifier IC"],
  ["TPA3116", "50 W stereo class-D amplifier IC"],
  ["NE5532", "Dual low-noise op-amp"],
  ["TL072", "Dual JFET-input op-amp"],
  ["LM833", "Dual audio op-amp"],
  ["IRF640", "N-channel power MOSFET"],
  ["IRF9640", "P-channel power MOSFET"],
  ["IRF250", "N-channel power MOSFET"],
  ["MBR745", "Schottky rectifier diode"],
  ["BAT86", "Schottky signal diode"],
  ["LM7805", "+5 V voltage regulator"],
  ["LM7812", "+12 V voltage regulator"],
];

/** Part facts keyed by normalised part number (normalizeQuery: "TL072" -> "tl072"). */
export const PART_INFO: Record<string, PartInfo> = Object.fromEntries(
  PART_LIST.map(([part, descriptor, complement]) => [
    normalizeQuery(part),
    { part, descriptor, ...(complement ? { complement: normalizeQuery(complement) } : null) },
  ])
);

const KEYS_LONGEST_FIRST = Object.keys(PART_INFO).sort((a, b) => b.length - a.length);

/** Most-counterfeited parts, in priority order for featured/home rows (spec §11). */
export const MOST_FAKED_PARTS: string[] = [
  "2SC5200",
  "2SA1943",
  "2SC5198",
  "2SA1941",
  "TIP35",
  "TIP36",
  "TIP142",
  "TIP147",
  "2N3055",
  "TDA7293",
  "TDA7294",
  "TPA3255",
  "LM1875",
  "NE5532",
  "TL072",
];

type Named = { _id?: string; name: string; stock?: number };

/** Normalised name tokens: "LM 3886 IC" -> ["lm3886", "ic"]. */
function nameTokens(name: string) {
  const joined = String(name || "").replace(/\b([A-Za-z]{1,4})\s+(\d{3,6}[A-Za-z]{0,3})\b/g, "$1$2");
  return joined
    .split(/[\s/,()–-]+/)
    .map(normalizeQuery)
    .filter(Boolean);
}

/** True when a name token starts with the part ("TIP35C" matches TIP35, "TIP3055" does not). */
export function matchesPart(name: string, part: string) {
  const needle = normalizeQuery(part);
  return Boolean(needle) && nameTokens(name).some((token) => token.startsWith(needle));
}

/** The PART_INFO key for a product ("bc557" for "BC557B ON SEMI"), or null. */
export function partKeyOf(product: Named): string | null {
  const tokens = nameTokens(product.name);
  for (const key of KEYS_LONGEST_FIRST) {
    if (tokens.some((token) => token.startsWith(key))) return key;
  }
  return null;
}

/** Part facts for a product, or null when it is not a listed part. */
export function partInfoOf(product: Named): PartInfo | null {
  const key = partKeyOf(product);
  return key ? PART_INFO[key] : null;
}

/** "NPN audio power transistor" for 2SC5200 etc.; null for unlisted parts. */
export function descriptorOf(product: Named): string | null {
  return partInfoOf(product)?.descriptor ?? null;
}

/** The MOST_FAKED_PARTS entry a product is, or null. */
export function mostFakedPart(product: Named): string | null {
  return MOST_FAKED_PARTS.find((part) => matchesPart(product.name, part)) ?? null;
}

export function isMostFaked(product: Named) {
  return mostFakedPart(product) !== null;
}

/**
 * Stable sort that moves most-faked parts to the front in list order (in-stock
 * first among them); other products keep their relative order behind them.
 */
export function preferMostFaked<T extends Named>(products: T[]): T[] {
  const rank = (product: T) => {
    const part = mostFakedPart(product);
    return part ? MOST_FAKED_PARTS.indexOf(part) : Number.POSITIVE_INFINITY;
  };
  return products
    .map((product, index) => ({ product, index, rank: rank(product), inStock: Number(product.stock ?? 1) > 0 }))
    .sort((a, b) => {
      const aFaked = Number.isFinite(a.rank);
      const bFaked = Number.isFinite(b.rank);
      if (aFaked !== bFaked) return aFaked ? -1 : 1;
      if (aFaked && bFaked && a.inStock !== b.inStock) return a.inStock ? -1 : 1;
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.index - b.index;
    })
    .map((row) => row.product);
}

/**
 * The complementary part (2SC5200 -> 2SA1943, TIP36 -> TIP35, BD139 -> BD140,
 * ...) found in `all`, preferring an in-stock listing. Null when the product
 * has no listed complement or the partner is not in the catalogue.
 */
export function complementOf<T extends Named>(product: Named, all: T[]): T | null {
  const partner = partInfoOf(product)?.complement;
  if (!partner) return null;
  const candidates = all.filter(
    (candidate) =>
      (product._id === undefined || candidate._id !== product._id) &&
      candidate.name !== product.name &&
      partKeyOf(candidate) === partner
  );
  return candidates.find((candidate) => Number(candidate.stock ?? 1) > 0) ?? candidates[0] ?? null;
}
