import { getDisplayPrice } from "@/lib/order-utils";

type ProductLike = {
  name?: string;
  category?: string;
  description?: string[];
  price?: number;
  discountPercentage?: number;
  flashSale?: boolean;
  packSize?: number | null;
};

// The "Manufacturer" lines are typed by hand, so one maker shows up spelled
// several ways ("ON semi", "ONSEMI", "- Onsemi"). Ads and search group
// products by brand, so map every known spelling to one name.
const BRAND_ALIASES: [RegExp, string][] = [
  [/^texas\s*instruments?$/i, "Texas Instruments"],
  [/^st\s*micro\s*electronics$/i, "STMicroelectronics"],
  [/^on\s*semi(conductor)?$/i, "onsemi"],
  [/infineon|^international\s*rect/i, "Infineon Technologies"],
  [/^vishay\s*siliconix$/i, "Vishay Siliconix"],
  [/^evvo\b/i, "EVVO"],
  [/^multicomp\s*pro$/i, "Multicomp Pro"],
];

function normalizeBrand(raw: string) {
  const brand = raw.replace(/^[\s\-–:]+/, "").replace(/\s+/g, " ").trim();
  const alias = BRAND_ALIASES.find(([pattern]) => pattern.test(brand));
  return alias ? alias[1] : brand;
}

// Products have no brand field; ads and search need one. Use the
// "Manufacturer - X" line most listings already carry, then known brands.
export function getProductBrand(product: ProductLike) {
  for (const line of product.description || []) {
    const match = String(line).match(/^\s*manufacturer\s*[-:–]\s*(.+?)\s*$/i);
    if (match?.[1]) {
      const brand = normalizeBrand(match[1]);
      if (brand) return brand;
    }
  }

  const name = String(product.name || "").toLowerCase();
  if (name.includes("peerless")) return "Peerless by Tymphany";
  if (String(product.category || "").toLowerCase() === "brainsaudios") return "BrainsAudios";

  return "CrazyAudios";
}

// Pack-only products can't be bought as a single unit, so ads and search
// results must show the price of the smallest quantity a customer can buy.
export function getSellablePrice(product: ProductLike) {
  const hasFlashSale = Boolean(product.flashSale) && Number(product.discountPercentage || 0) > 0;
  const { inclusiveBasePrice, inclusiveFinalPrice } = getDisplayPrice(
    Number(product.price) || 0,
    Number(product.discountPercentage || 0),
    hasFlashSale
  );
  const packSize = Math.max(1, Number(product.packSize) || 1);

  return {
    packSize,
    unitPrice: inclusiveFinalPrice,
    sellPrice: Number((inclusiveFinalPrice * packSize).toFixed(2)),
    sellBasePrice: Number((inclusiveBasePrice * packSize).toFixed(2)),
    onSale: hasFlashSale && inclusiveFinalPrice < inclusiveBasePrice,
  };
}

export function getProductSummary(product: ProductLike, maxLength = 200) {
  const lines = (product.description || [])
    .map((line) => String(line).trim())
    .filter((line) => line && !/^\s*manufacturer\s*[-:–]/i.test(line));
  const summary = lines.join(". ");
  if (summary.length <= maxLength) return summary;
  return `${summary.slice(0, maxLength - 1).trimEnd()}…`;
}
