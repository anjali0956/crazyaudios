// Dependency-free text normalisation shared by search, display and parts.

/**
 * Normalise a query or a catalogue string for loose part-number matching:
 * lowercase, µ -> u, Ω -> ohm, drop everything that is not a letter or digit,
 * and treat the letter O as the digit 0 ("TLO72" == "TL072", "lm 3886" == "LM3886").
 */
export function normalizeQuery(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[µμ]/g, "u")
    .replace(/ω/g, "ohm")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .replace(/o/g, "0");
}
