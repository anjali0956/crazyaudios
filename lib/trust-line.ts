// The sourcing line under the stock status on product pages.
// Claims confirmed by the owner (4 Oct 2026): every component, semiconductors
// and passives alike, is directly imported. Peerless speakers come through
// certified importers, so they get their own line (only when the listing
// really is a Peerless product). Modules and anything else carry no claim.
const DIRECTLY_IMPORTED = new Set([
  "amplifier ic",
  "transistor",
  "mosfet",
  "op-amplifiers",
  "diode",
  "voltage regulator",
  "capacitor",
  "resistor",
  "connectors",
  "rotary encoder",
]);

const SPEAKER_DRIVERS = new Set(["woofer", "subwoofer", "full range", "tweeter", "pro audio", "speaker"]);

export function productTrustLine(product: { category?: string; name?: string; description?: string[] }): string | null {
  const category = String(product.category ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (DIRECTLY_IMPORTED.has(category)) return "Original · Directly imported";
  if (SPEAKER_DRIVERS.has(category)) {
    const text = [product.name, ...(product.description || [])].join(" ");
    return /peerless/i.test(text) ? "Genuine Peerless by Tymphany" : null;
  }
  return null;
}
