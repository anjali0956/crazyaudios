// Category model shared by server and client code (no database access here).
// Raw category names are the lowercase free text stored on each product;
// slugs are what URLs, canonicals and links use. Old URLs that carry the raw
// name (/category/amplifier%20ic) still resolve through resolveCategory().

export type CategoryGroupId = "semiconductors" | "speaker-drivers" | "passives" | "modules" | "more";

export type CategoryGroup = {
  id: CategoryGroupId;
  /** Group slug, also usable as /category/<slug> (see resolveGroup). */
  slug: string;
  label: string;
  /** Short line shown under the group label in menus and tiles. */
  blurb: string;
  /** Raw category names in display order. */
  categories: string[];
};

export type CategoryInfo = {
  /** Raw category as stored on products (lowercase, trimmed). */
  raw: string;
  label: string;
  slug: string;
  group: CategoryGroupId;
  groupLabel: string;
  /** Canonical URL path: /category/<slug>. */
  href: string;
  /** False for categories that are not in the map (label/slug derived). */
  known: boolean;
};

// Department order is the owner's (spec §11): components lead, speakers come last.
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: "semiconductors",
    slug: "semiconductors",
    label: "Semiconductors",
    blurb: "Amplifier ICs, transistors, MOSFETs, op-amps",
    categories: ["amplifier ic", "transistor", "mosfet", "op-amplifiers", "diode", "voltage regulator"],
  },
  {
    id: "passives",
    slug: "passives",
    label: "Passives & hardware",
    blurb: "Capacitors, resistors, connectors, encoders",
    categories: ["capacitor", "resistor", "connectors", "rotary encoder"],
  },
  {
    id: "modules",
    slug: "modules",
    label: "Modules & boards",
    blurb: "BrainsAudios tone control, input selector and more",
    categories: ["brainsaudios"],
  },
  {
    id: "speaker-drivers",
    slug: "speaker-drivers",
    label: "Speaker drivers",
    blurb: "Peerless by Tymphany woofers, tweeters, full-range",
    categories: ["woofer", "subwoofer", "full range", "tweeter", "pro audio", "speaker"],
  },
  {
    id: "more",
    slug: "more",
    label: "More",
    blurb: "Everything else in the catalogue",
    categories: [],
  },
];

const KNOWN: Record<string, { label: string; slug: string; group: CategoryGroupId }> = {
  "amplifier ic": { label: "Amplifier ICs", slug: "amplifier-ics", group: "semiconductors" },
  transistor: { label: "Transistors", slug: "transistors", group: "semiconductors" },
  mosfet: { label: "MOSFETs", slug: "mosfets", group: "semiconductors" },
  "op-amplifiers": { label: "Op-amps", slug: "op-amps", group: "semiconductors" },
  diode: { label: "Diodes", slug: "diodes", group: "semiconductors" },
  "voltage regulator": { label: "Voltage regulators", slug: "voltage-regulators", group: "semiconductors" },
  woofer: { label: "Woofers", slug: "woofers", group: "speaker-drivers" },
  subwoofer: { label: "Subwoofers", slug: "subwoofers", group: "speaker-drivers" },
  "full range": { label: "Full-range drivers", slug: "full-range", group: "speaker-drivers" },
  tweeter: { label: "Tweeters", slug: "tweeters", group: "speaker-drivers" },
  "pro audio": { label: "Pro audio", slug: "pro-audio", group: "speaker-drivers" },
  speaker: { label: "Speakers", slug: "speakers", group: "speaker-drivers" },
  capacitor: { label: "Capacitors", slug: "capacitors", group: "passives" },
  resistor: { label: "Resistors", slug: "resistors", group: "passives" },
  connectors: { label: "Connectors", slug: "connectors", group: "passives" },
  "rotary encoder": { label: "Rotary encoders", slug: "rotary-encoders", group: "passives" },
  brainsaudios: { label: "BrainsAudios modules", slug: "brainsaudios", group: "modules" },
};

/** Every raw category the map knows, in menu order. */
export const KNOWN_CATEGORIES: string[] = CATEGORY_GROUPS.flatMap((group) => group.categories);

const GROUP_BY_ID = new Map(CATEGORY_GROUPS.map((group) => [group.id, group]));

export function normalizeRawCategory(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function slugify(value: string) {
  return normalizeRawCategory(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getGroup(id: CategoryGroupId): CategoryGroup {
  return GROUP_BY_ID.get(id) ?? CATEGORY_GROUPS[CATEGORY_GROUPS.length - 1];
}

/** Full display info for a raw category (unknown names get a derived label/slug in "More"). */
export function categoryInfo(rawCategory: unknown): CategoryInfo {
  const raw = normalizeRawCategory(rawCategory);
  const known = KNOWN[raw];
  const slug = known?.slug ?? slugify(raw);
  const group = known?.group ?? "more";
  return {
    raw,
    label: known?.label ?? titleCase(raw),
    slug,
    group,
    groupLabel: getGroup(group).label,
    href: `/category/${slug}`,
    known: Boolean(known),
  };
}

export const categoryLabel = (raw: unknown) => categoryInfo(raw).label;
export const categorySlug = (raw: unknown) => categoryInfo(raw).slug;
export const categoryGroup = (raw: unknown) => categoryInfo(raw).group;
export const categoryHref = (raw: unknown) => categoryInfo(raw).href;

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Resolve a /category/[param] value: a slug ("amplifier-ics"), a raw name
 * ("amplifier ic") or an encoded raw name ("amplifier%20ic").
 * Pass the raw categories that exist in the database as `knownRaw` so slugs
 * of categories outside the map (e.g. a new "headphones" category) resolve too.
 * Returns null when nothing matches.
 */
export function resolveCategory(param: unknown, knownRaw: string[] = []): CategoryInfo | null {
  const decoded = normalizeRawCategory(safeDecode(String(param ?? "")));
  if (!decoded) return null;

  if (KNOWN[decoded]) return categoryInfo(decoded);

  const slug = slugify(decoded);
  const knownBySlug = Object.entries(KNOWN).find(([, entry]) => entry.slug === slug || entry.slug === decoded);
  if (knownBySlug) return categoryInfo(knownBySlug[0]);

  for (const candidate of knownRaw) {
    const raw = normalizeRawCategory(candidate);
    if (raw === decoded || slugify(raw) === slug) return categoryInfo(raw);
  }

  return null;
}

/** Resolve a group slug ("speaker-drivers", "passives", ...). */
export function resolveGroup(param: unknown): CategoryGroup | null {
  const value = slugify(safeDecode(String(param ?? "")));
  return CATEGORY_GROUPS.find((group) => group.slug === value || group.id === value) ?? null;
}

/**
 * Primary navigation (desktop header), in the owner's department order.
 * Single-category groups link straight to the category; multi-category groups
 * link to their group slug, which getProductsByGroup() serves.
 */
export const PRIMARY_NAV: Array<{ label: string; href: string }> = [
  { label: "Amplifier ICs", href: "/category/amplifier-ics" },
  { label: "Transistors", href: "/category/transistors" },
  { label: "Passives", href: "/category/passives" },
  { label: "Modules", href: "/category/brainsaudios" },
  { label: "Speaker drivers", href: "/category/speaker-drivers" },
];

// ---------------------------------------------------------------- sourcing
// Spec §14 (owner-confirmed): semiconductors AND passives & hardware are
// directly imported; speaker drivers and modules are not. Widening or
// narrowing the claim is a one-line change to this list.
export const DIRECTLY_IMPORTED_GROUPS: string[] = ["Semiconductors", "Passives & hardware"];

/** True when products in this raw category may be described as "directly imported". */
export function isDirectlyImported(rawCategory: unknown) {
  const info = categoryInfo(rawCategory);
  return info.known && DIRECTLY_IMPORTED_GROUPS.includes(getGroup(info.group).label);
}

/**
 * The one-line sourcing claim for a category's trust strip / product badge:
 * directly imported categories "Original · Directly imported · Invoice with GST",
 * speaker drivers "Genuine Peerless by Tymphany · Invoice with GST",
 * everything else (BrainsAudios modules, unknown) "Original · Invoice with GST".
 */
export function trustLine(rawCategory: unknown) {
  if (isDirectlyImported(rawCategory)) return "Original · Directly imported · Invoice with GST";
  if (categoryInfo(rawCategory).group === "speaker-drivers") return "Genuine Peerless by Tymphany · Invoice with GST";
  return "Original · Invoice with GST";
}
