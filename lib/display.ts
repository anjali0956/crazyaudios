// Presentation layer for catalogue text (spec §15). Raw database values are
// never changed: use displayName() for everything a customer reads, and keep
// the raw product.name in Meta Pixel payloads, the feed and CAPI.
import { formatINR, pricingOf, type PriceInput } from "@/lib/format";

type Named = { name: string };

// "LM 3886" -> "LM3886": a space between a known part prefix and its digits.
const PREFIX_SPACE = /^(LM|TDA|TPA|NE|TL|IRF|IRFP|TIP|BD|BC|MJ|KSC|MBR|BAT|2SC|2SA|2N)\s+(?=\d)/i;

// Whole-name fixes for listings typed in a hurry (lowercased, single-spaced keys).
const NAME_ALIASES: Record<string, string> = {
  tlo72: "TL072",
  "10000 uf 63volt": "10000µF 63V capacitor",
  "0.22 ohms 5watt": "0.22 Ω 5 W resistor",
  "bc557b on semi": "BC557B",
};

// Acronyms that stay upper case when an ALL-CAPS name is re-cased.
const KEEP_UPPER = new Set([
  "USB", "RCA", "PCB", "FM", "AM", "DC", "AC", "IC", "LED", "SDS", "HDS", "SLS", "XLS", "XXLS", "GFC", "DFM", "PA",
  "NPN", "PNP", "JFET", "MOSFET", "DMOS", "SMD", "THT", "TO", "DIP", "BT", "AUX", "XLR", "TRS",
]);
const SMALL_WORDS = new Set(["a", "an", "and", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);

function isAllCapsLong(name: string) {
  const words = name.split(/\s+/).filter((word) => /[A-Za-z]/.test(word) && !/\d/.test(word));
  if (words.length < 2) return false;
  const letters = words.join("").replace(/[^A-Za-z]/g, "");
  return letters.length >= 8 && letters === letters.toUpperCase();
}

function recase(name: string) {
  return name
    .split(" ")
    .map((word, index) => {
      if (!word || /\d/.test(word)) return word;
      const bare = word.replace(/[^A-Za-z]/g, "");
      if (KEEP_UPPER.has(bare.toUpperCase()) && bare === bare.toUpperCase()) return word;
      const lower = word.toLowerCase();
      if (index > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.replace(/[a-z]/, (letter) => letter.toUpperCase());
    })
    .join(" ");
}

// Brand prefixes a card can drop when the brand already shows as its kicker.
const BRAND_PREFIXES = [/^peerless\s+by\s+tymphany\s+/i, /^peerless\s+/i, /^samwha\s+electronics\s+/i];

/**
 * Customer-facing product name:
 * "LM 3886" -> "LM3886", "TLO72" -> "TL072", "10uF" -> "10µF", ALL-CAPS
 * names re-cased (part numbers untouched), plus a few whole-name aliases.
 * `dropBrand` removes a leading "Peerless by Tymphany"/"Samwha Electronics"
 * where the brand is already shown (card kicker).
 */
export function displayName(product: Named | string, options: { dropBrand?: boolean } = {}) {
  let name = String(typeof product === "string" ? product : product?.name ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return "";

  const alias = NAME_ALIASES[name.toLowerCase()];
  if (alias) return alias;

  name = name
    .replace(PREFIX_SPACE, (prefix) => prefix.trim())
    .replace(/\bTLO72\b/gi, "TL072")
    .replace(/(\d)\s?[uU][fF]\b/g, "$1µF");

  if (isAllCapsLong(name)) name = recase(name);

  if (options.dropBrand) {
    for (const prefix of BRAND_PREFIXES) {
      const stripped = name.replace(prefix, "");
      // Only when a model/value remains ("Peerless By Tymphany" alone stays as is).
      if (stripped !== name && /\d/.test(stripped)) {
        name = stripped.charAt(0).toUpperCase() + stripped.slice(1);
        break;
      }
    }
  }
  return name;
}

/**
 * Key two listings share when they are the same part: the display name
 * lowercased without spaces or punctuation, but keeping decimal points so
 * "2.2µF" and "22µF" stay different parts.
 */
export function displayKey(product: Named) {
  return displayName(product)
    .toLowerCase()
    .replace(/[µμ]/g, "u")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(\d)\.(?=\d)/g, "$1p")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

type Dedupable = Named & { stock?: number; createdAt?: string | null };

/**
 * One listing per part for mixed lists (department pages, search, featured):
 * products with the same normalised display name collapse to the best one
 * (in stock, then more stock, then newer), kept at the first one's position.
 */
export function dedupeByDisplayName<T extends Dedupable>(products: T[]): T[] {
  const best = new Map<string, T>();
  const better = (a: T, b: T) => {
    const aIn = Number(a.stock) > 0 ? 1 : 0;
    const bIn = Number(b.stock) > 0 ? 1 : 0;
    if (aIn !== bIn) return aIn > bIn;
    if ((Number(a.stock) || 0) !== (Number(b.stock) || 0)) return (Number(a.stock) || 0) > (Number(b.stock) || 0);
    return String(a.createdAt ?? "") > String(b.createdAt ?? "");
  };
  for (const product of products) {
    const key = displayKey(product);
    const current = best.get(key);
    if (!current || better(product, current)) best.set(key, product);
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
 * Product photos known to show the wrong item (spec §16): /pa11.jpg, used by
 * "Waveguide WG 148 R", is byte-identical to /s8.jpg (an 18″ subwoofer).
 * Render a "Photo coming soon" placeholder instead of these. Exported through
 * lib/catalog as well.
 */
export const KNOWN_WRONG_IMAGES: readonly string[] = ["/pa11.jpg"];

/** True when a stored photo path (or our own absolute URL) is in KNOWN_WRONG_IMAGES. */
export function isKnownWrongImage(src: unknown) {
  const value = String(src ?? "").trim();
  if (!value) return false;
  const path = value.replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/)[0];
  return KNOWN_WRONG_IMAGES.includes(path.startsWith("/") ? path : `/${path}`);
}

/**
 * Headline price for a product, pack-aware: "₹950" or "₹12 · pack of 10"
 * (unit price x pack size). Use pricingOf() when you need the numbers.
 */
export function packPriceLabel(product: PriceInput) {
  const pricing = pricingOf(product);
  return pricing.packSize > 1 ? `${formatINR(pricing.sellPrice)} · pack of ${pricing.packSize}` : formatINR(pricing.sellPrice);
}
