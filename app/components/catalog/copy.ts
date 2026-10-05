// Customer-facing copy for category and department pages. Plain and factual:
// what the range is, never invented specs, counts or claims. Sourcing claims
// come only from lib/categories (isDirectlyImported / trustLine).
import type { CategoryGroupId } from "@/lib/categories";

/** One-line intro per raw category (lowercase, as stored on products). */
export const CATEGORY_INTROS: Record<string, string> = {
  "amplifier ic": "Audio power amplifier ICs for building and repairing amplifiers, from chip amps to class-D.",
  transistor: "Audio power, Darlington and small-signal transistors, including complementary NPN/PNP pairs.",
  mosfet: "N-channel and P-channel power MOSFETs.",
  "op-amplifiers": "Dual op-amps for preamps, tone controls and filters.",
  diode: "Schottky rectifier and signal diodes.",
  "voltage regulator": "Fixed linear voltage regulators for power supplies.",
  capacitor: "Electrolytic capacitors for power supplies, coupling and decoupling.",
  resistor: "Power resistors, including emitter resistors for amplifier output stages.",
  connectors: "Audio jacks, RCA sockets and USB sockets for panels and PCBs.",
  "rotary encoder": "Rotary encoder modules for volume and input control.",
  brainsaudios: "Ready-made audio boards from BrainsAudios for amplifier builds.",
  // Speaker pages already name the brand in the kicker and the sourcing line.
  woofer: "Woofers and mid-woofers for two- and three-way speakers.",
  subwoofer: "Subwoofers and bass drivers.",
  "full range": "Full-range drivers for compact and desktop speakers.",
  tweeter: "Dome, ring-radiator and compression tweeters.",
  "pro audio": "Professional woofers, compression drivers and waveguides.",
};

/** One-line intro per department (group) page. */
export const GROUP_INTROS: Record<CategoryGroupId, string> = {
  semiconductors: "Amplifier ICs, transistors, MOSFETs, op-amps, diodes and voltage regulators.",
  passives: "Capacitors, resistors, connectors and rotary encoders.",
  modules: "Ready-made audio boards from BrainsAudios.",
  "speaker-drivers": "Woofers, subwoofers, full-range drivers, tweeters and pro-audio drivers.",
  more: "Everything else in the catalogue.",
};

/** H1 for department pages where the group label alone undersells the range. */
export const GROUP_TITLES: Partial<Record<CategoryGroupId, string>> = {
  "speaker-drivers": "Peerless by Tymphany speaker drivers",
};

/** What a listing counts: "20 parts", "46 drivers", "3 modules". */
export function unitNoun(group: CategoryGroupId, count: number) {
  const one = count === 1;
  if (group === "speaker-drivers") return one ? "driver" : "drivers";
  if (group === "modules") return one ? "module" : "modules";
  return one ? "part" : "parts";
}

/**
 * A label for use mid-sentence: "Amplifier ICs" -> "amplifier ICs",
 * "Op-amps" -> "op-amps", but "MOSFETs" and "BrainsAudios modules" stay.
 */
export function midSentence(label: string) {
  return label.replace(/^([A-Z])([a-z-]+)(?=\s|$)/, (_, first: string, rest: string) => first.toLowerCase() + rest);
}

/** Short kicker above a category H1 (the brand for Peerless ranges). */
export function categoryKicker(group: CategoryGroupId, groupLabel: string) {
  if (group === "speaker-drivers") return "Peerless by Tymphany";
  if (group === "more") return null;
  return groupLabel;
}
