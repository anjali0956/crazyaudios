// View model for the product page: what the PDP shows, derived from a
// CatalogProduct through the display layer (spec §15). Pure functions; the raw
// database values are never changed and Meta payloads keep the raw name.
import type { CatalogProduct } from "@/lib/catalog";
import { categoryInfo, isDirectlyImported, trustLine } from "@/lib/categories";
import { displayName, isKnownWrongImage } from "@/lib/display";
import { formatINR, partNumbersOf, specsOf, type SpecRow } from "@/lib/format";
import { normalizeQuery } from "@/lib/normalize";
import { partInfoOf, partKeyOf } from "@/lib/parts";
import { getProductBrand } from "@/lib/product-info";
import { isCodAllowed } from "@/lib/shipping-policy";

// Hand-typed maker lines the shared parser does not read: "Brand _TOSHIBA",
// "MFG- SMC Diode solutions", "MFR-On semi". A separator is required, so
// prose such as "Brand new design" is never mistaken for one.
const LOOSE_MAKER_LINE = /^\s*(?:brand|manufacturer|mfg|mfr)\s*[-_:–—.]+\s*(\S.*?)\s*$/i;

/** "TOSHIBA" -> "Toshiba"; acronyms up to four letters (SMC, EVVO) stay as typed. */
function tidyBrand(raw: string) {
  // The shared normaliser keeps spellings identical to the Meta feed ("On semi" -> "onsemi").
  const shared = getProductBrand({ description: [`Manufacturer - ${raw}`] });
  return shared
    .split(" ")
    .map((word) => (/^[A-Z]{5,}$/.test(word) ? word.charAt(0) + word.slice(1).toLowerCase() : word))
    .join(" ");
}

/** Brand for the kicker and specs: the catalogue brand, else a loosely typed maker line. */
export function pdpBrand(product: Pick<CatalogProduct, "brand" | "description">): string | null {
  if (product.brand) return product.brand;
  for (const line of product.description) {
    const match = line.match(LOOSE_MAKER_LINE);
    if (match?.[1] && !/^generic$/i.test(match[1])) return tidyBrand(match[1]);
  }
  return null;
}

/** Customer-facing title for the H1/breadcrumb: the brand prefix is dropped when the kicker shows it. */
export function pdpTitle(product: CatalogProduct, brand: string | null) {
  return displayName(product, { dropBrand: Boolean(brand) });
}

/** <title> (the layout template appends " | CrazyAudios"), spec §12/§14. */
export function pageTitle(product: CatalogProduct) {
  return isDirectlyImported(product.category)
    ? `${product.displayName} – Original, directly imported`
    : `${product.displayName} – Original`;
}

/**
 * The sourcing claim for this product (spec §14 via trustLine). A speaker-
 * drivers listing that is not a Peerless product gets the plain claim, so the
 * page never calls another maker's part "Genuine Peerless".
 */
export function pdpTrustLine(product: CatalogProduct, brand: string | null) {
  if (categoryInfo(product.category).group === "speaker-drivers" && brand !== "Peerless by Tymphany") {
    return "Original · GST invoice";
  }
  return trustLine(product.category);
}

/** Photos to show, main first, without duplicates or known-wrong images. */
export function galleryImagesOf(product: Pick<CatalogProduct, "image" | "extraImages">) {
  const seen = new Set<string>();
  return [product.image, ...product.extraImages].filter((src) => {
    const value = String(src ?? "").trim();
    if (!value || seen.has(value) || isKnownWrongImage(value)) return false;
    seen.add(value);
    return true;
  });
}

const tidyValue = (value: string) => value.replace(/(\d)\s?[uU][fF]\b/g, "$1µF");

// Unambiguous misspellings in hand-typed descriptions (display only; the database is unchanged).
const TYPOS: Array<[RegExp, string]> = [
  [/\bGenaral\b/g, "General"],
  [/\btransitor\b/g, "transistor"],
  [/\bTeteron\b/g, "Tetoron"],
];

const tidyText = (line: string) => TYPOS.reduce((text, [pattern, fix]) => text.replace(pattern, fix), line);

/** Description lines that are not specs or maker lines, in their original order. */
export function highlightsOf(product: CatalogProduct) {
  return specsOf(product)
    .highlights.filter((line) => !LOOSE_MAKER_LINE.test(line))
    .map(tidyText);
}

const PACKAGE_CODE = /\b(TO-?\d{1,3}[A-Z]{0,2}|DIP-?\d{1,2}|SOIC-?\d{1,2}|SOT-?\d{2,3}(?:-\d)?)\b/i;

/** Package code from the "Package" spec ("TO-220", "TO-3P", "TO-92") for a chip next to the title. */
export function packageChips(product: CatalogProduct): string[] {
  const pkg = specsOf(product).specs.find((row) => /^package$/i.test(row.label))?.value;
  const code = pkg?.match(PACKAGE_CODE)?.[1];
  return code ? [code.toUpperCase()] : [];
}

/** The part number as the customer reads it ("TL072", "BC557B"), for listed parts only. */
function partNumberOf(product: CatalogProduct) {
  const key = partKeyOf(product);
  const info = partInfoOf(product);
  if (!key || !info) return null;
  const fromName = partNumbersOf({ name: product.displayName }).find((token) => normalizeQuery(token).startsWith(key));
  return fromName ?? info.part;
}

/**
 * Model code exactly as it appears in the name ("830452", "FSL-0512R01-08"),
 * for products that are not listed parts. Codes the name only implies (the
 * "WG148" of "WG 148 R") are left out.
 */
function modelOf(product: CatalogProduct) {
  const name = product.displayName.toUpperCase();
  return partNumbersOf({ name: product.displayName }).find((token) => name.includes(token)) ?? null;
}

/**
 * Datasheet rows: part number (or model), type (PART_INFO), brand, every
 * "Key: Value" line from the description, and the pack size. Nothing is invented.
 */
export function keySpecRows(product: CatalogProduct, brand: string | null): SpecRow[] {
  const specs = specsOf(product).specs.map((row) => ({ label: row.label, value: tidyText(tidyValue(row.value)) }));
  const has = (label: RegExp) => specs.some((row) => label.test(row.label));
  const rows: SpecRow[] = [];
  const part = partNumberOf(product);
  const model = part ? null : modelOf(product);
  if (part) rows.push({ label: "Part number", value: part });
  else if (model) rows.push({ label: "Model", value: model });

  // The part's type sits next to its number: the description's "Type:" line, else PART_INFO.
  const typeRow = specs.find((row) => /^type$/i.test(row.label));
  if (typeRow) rows.push(typeRow);
  else if (product.descriptor) rows.push({ label: "Type", value: product.descriptor });
  if (brand) rows.push({ label: "Brand", value: brand });

  // Capacitors listed without spec lines still state both values in their name ("10000µF 63V capacitor").
  if (product.category === "capacitor" && !has(/^capacitance$/i)) {
    const values = product.displayName.match(/(\d+(?:\.\d+)?\s?µF)\s+(\d+(?:\.\d+)?\s?V)\b/);
    if (values) {
      rows.push({ label: "Capacitance", value: values[1].replace(/\s/g, "") });
      if (!has(/voltage/i)) rows.push({ label: "Voltage rating", value: values[2].replace(/\s/g, "") });
    }
  }

  for (const row of specs) if (row !== typeRow) rows.push(row);
  if (product.minQty > 1) rows.push({ label: "Sold in", value: `Packs of ${product.minQty}` });
  return rows;
}

/** "amplifier ICs", "MOSFETs", "BrainsAudios modules": a category label inside a sentence. */
export function inSentence(label: string) {
  const [first = "", ...rest] = label.split(" ");
  const keep = /[A-Z].*[A-Z]/.test(first);
  return [keep ? first : first.toLowerCase(), ...rest].join(" ");
}

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/[\s,;:.–-]+\S*$/, "").trimEnd()}…`;
}

/**
 * Meta description (spec §12/§14): says "original", the price, stock, GST
 * invoice and Cash on Delivery (only when the product qualifies), then the
 * first highlight.
 */
export function metaDescription(product: CatalogProduct, brand: string | null) {
  const name = product.displayName;
  const maker = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ` : "";
  // "Dual low-noise op-amp" reads "dual low-noise op-amp" mid-sentence; NPN, N-channel, Schottky stay.
  const descriptor = product.descriptor?.replace(/^Dual\b/, "dual");
  const what = [`Original ${maker}${name}`, descriptor].filter(Boolean).join(" ");
  const lead = isDirectlyImported(product.category) ? `${what}, directly imported.` : `${what}.`;
  const pack = product.minQty > 1 ? ` for a pack of ${product.minQty}` : "";
  const stock = product.stock > 0 ? "In stock" : "Out of stock";
  const pay = isCodAllowed(product.sellPrice) ? "Cash on Delivery available" : "Pay by UPI, card or netbanking";
  const facts = `${formatINR(product.sellPrice)}${pack} incl. GST · ${stock} · GST invoice · ${pay}.`;
  const first = clip((highlightsOf(product)[0] ?? "").replace(/[.\s]+$/, ""), 120);
  const tail = first && !first.endsWith("…") ? `${first}.` : first;
  return [lead, facts, tail].filter(Boolean).join(" ");
}
