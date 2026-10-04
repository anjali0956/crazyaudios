// Customer-facing formatting and product display helpers. Client-safe.
import { getDisplayPrice } from "@/lib/order-utils";
import { getProductBrand } from "@/lib/product-info";

export { categoryLabel, categorySlug, categoryGroup, categoryHref, categoryInfo } from "@/lib/categories";

/** Round half up to `decimals` places, without binary-float surprises (1.005 -> 1.01). */
export function roundHalfUp(value: number, decimals = 0) {
  const factor = 10 ** decimals;
  const n = Number(value) || 0;
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(n) * factor + 1e-7)) / factor;
}

const INR_WHOLE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const INR_PAISE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * "₹1,113" for prices of ₹10 and up (whole rupees, half rounds up),
 * "₹1.20" for tiny per-piece prices under ₹10 that have paise.
 */
export function formatINR(value: number) {
  const n = Number(value) || 0;
  const paise = roundHalfUp(n, 2);
  if (Math.abs(paise) < 10 && !Number.isInteger(paise)) {
    return INR_PAISE.format(paise);
  }
  return INR_WHOLE.format(roundHalfUp(n, 0));
}

/** Plain number with Indian grouping: 125000 -> "1,25,000". */
export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}

/** Discount label with a true minus sign: 10 -> "−10%". */
export function formatDiscount(percent: number) {
  return `−${Math.round(Number(percent) || 0)}%`;
}

/** "1 item", "3 items" — pass the plural if it is not just +s. */
export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

export type PriceInput = {
  price: number;
  packSize?: number | null;
  flashSale?: boolean;
  discountPercentage?: number;
};

export type ProductPricing = {
  /** What one unit costs the customer (GST incl.). */
  unitPrice: number;
  /** Struck unit price when a flash sale applies, otherwise null. */
  unitMrp: number | null;
  /** Smallest quantity a customer can buy (1, or the pack size). */
  packSize: number;
  /** Price of the smallest sellable quantity (unit price x pack size). */
  sellPrice: number;
  /** Struck price for the smallest sellable quantity, or null. */
  sellMrp: number | null;
  onSale: boolean;
  /** Effective discount percent (0 when not on sale). */
  discount: number;
};

/** Display pricing via lib/order-utils getDisplayPrice (the store's only price rule). */
export function pricingOf(product: PriceInput): ProductPricing {
  const discount = Math.max(0, Math.min(95, Number(product.discountPercentage) || 0));
  const onSale = Boolean(product.flashSale) && discount > 0;
  const { inclusiveBasePrice, inclusiveFinalPrice } = getDisplayPrice(
    Number(product.price) || 0,
    discount,
    onSale
  );
  const packSize = Math.max(1, Math.floor(Number(product.packSize) || 1));
  const real = onSale && inclusiveFinalPrice < inclusiveBasePrice;
  return {
    unitPrice: inclusiveFinalPrice,
    unitMrp: real ? inclusiveBasePrice : null,
    packSize,
    sellPrice: Number((inclusiveFinalPrice * packSize).toFixed(2)),
    sellMrp: real ? Number((inclusiveBasePrice * packSize).toFixed(2)) : null,
    onSale: real,
    discount: real ? discount : 0,
  };
}

type DescribedProduct = {
  name?: string;
  category?: string;
  description?: string[] | null;
};

const BRAND_LINE = /^\s*brand\s*(?:[-:–—]+)\s*(.+?)\s*$/i;
const MANUFACTURER_LINE = /^\s*manufacturer\s*(?:[-:–—]+)\s*(.+?)\s*$/i;

// Hand-typed "Brand:" lines carry a few misspellings; normalise the ones we know.
const BRAND_LINE_ALIASES: Array<[RegExp, string]> = [
  [/^samw(ha|ah)(\s+electronics?)?$/i, "Samwha Electronics"],
];

function brandFromBrandLine(product: DescribedProduct) {
  for (const line of product.description || []) {
    const match = String(line).match(BRAND_LINE);
    if (!match?.[1]) continue;
    const value = match[1].replace(/\s+/g, " ").trim();
    if (!value || /^generic$/i.test(value)) return null;
    const alias = BRAND_LINE_ALIASES.find(([pattern]) => pattern.test(value));
    if (alias) return alias[1];
    // Reuse the shared spelling normalisation (ON semi -> onsemi, ...).
    return getProductBrand({ description: [`Manufacturer - ${value}`] });
  }
  return null;
}

/**
 * The maker to show as a kicker ("Texas Instruments", "Peerless by Tymphany"),
 * or null when the product has no real brand (generic parts). Uses
 * getProductBrand (shared with the Meta feed) so spellings stay consistent.
 */
export function brandOf(product: DescribedProduct): string | null {
  const hasManufacturerLine = (product.description || []).some((line) => MANUFACTURER_LINE.test(String(line)));
  const brand = getProductBrand({ ...product, description: product.description ?? undefined });
  if (brand && (brand !== "CrazyAudios" || hasManufacturerLine)) return brand;
  return brandFromBrandLine(product);
}

export type SpecRow = { label: string; value: string };
export type ProductSpecs = { brand?: string; specs: SpecRow[]; highlights: string[] };

// "Capacitance: 10uF", "Package: TO-220 (3-pin: In, Gnd, Out)". The key must
// look like a label (short, starts with a letter, no sentence punctuation).
const SPEC_LINE = /^\s*([A-Za-z][A-Za-z0-9 /&().+#°-]{0,38}?)\s*:\s*(\S.*)$/;

/**
 * Split a product description into datasheet rows and plain highlights.
 * Manufacturer/Brand lines become `brand` (not a row); "Key: Value" lines
 * become specs; everything else is a highlight, in original order.
 */
export function specsOf(product: DescribedProduct): ProductSpecs {
  const specs: SpecRow[] = [];
  const highlights: string[] = [];
  for (const rawLine of product.description || []) {
    const line = String(rawLine ?? "").replace(/\s+/g, " ").trim();
    if (!line || /^no description$/i.test(line)) continue;
    if (MANUFACTURER_LINE.test(line) || BRAND_LINE.test(line)) continue;
    const match = line.match(SPEC_LINE);
    if (match && match[1].split(" ").length <= 5) {
      specs.push({ label: match[1].trim(), value: match[2].trim() });
    } else {
      highlights.push(line);
    }
  }
  const brand = brandOf(product) ?? undefined;
  return { brand, specs, highlights };
}

/**
 * Part numbers to show as chips: tokens in the name that mix letters and
 * digits (LM3886, 2SC5200, OX32SC00-08) or long digit runs (830656), plus a
 * "Package" spec such as TO-220. "LM 3886" is joined into "LM3886".
 */
export function partNumbersOf(product: DescribedProduct): string[] {
  const name = String(product.name || "")
    // join a letter prefix separated from its number by a space: "LM 3886"
    .replace(/\b([A-Za-z]{1,4})\s+(\d{3,6}[A-Za-z]{0,3})\b/g, "$1$2");
  const found: string[] = [];
  for (const token of name.split(/[\s,/()″"'’]+/)) {
    const clean = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
    if (clean.length < 4) continue;
    const hasDigit = /\d/.test(clean);
    const hasLetter = /[A-Za-z]/.test(clean);
    // Values and sizes ("4.7uF", "63V", "6.5mm", "3Pin", "24-Bolt") are not part numbers.
    const isValue = /^\d+(\.\d+)?-?(uf|µf|pf|nf|v|volts?|w|watts?|mm|cm|inch|ohms?|k|pin|bolt|way|a|mah|hz|khz)$/i.test(clean);
    const isPart = (hasDigit && hasLetter && !isValue) || /^\d{6,}$/.test(clean);
    if (isPart) found.push(clean.toUpperCase());
  }
  const pkg = specsOf(product).specs.find((row) => /^package$/i.test(row.label));
  const pkgCode = pkg?.value.match(/\b(TO-?\d{2,3}[A-Z]?|DIP-?\d+|SOIC-?\d+|SOT-?\d+)\b/i)?.[1];
  if (pkgCode) found.push(pkgCode.toUpperCase());
  return [...new Set(found)].slice(0, 3);
}
