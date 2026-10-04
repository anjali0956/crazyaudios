import { normalizeIndianState, type IndianStateOrUT } from "@/lib/india";

// PIN code -> city / district / state, from India Post's public directory
// (api.postalpincode.in). Used only to pre-fill the checkout address: callers
// must treat every failure as "let the customer type it".

export type PincodeInfo = {
  pincode: string;
  /** Town or city to pre-fill (the head post office's town, else the district). */
  city: string;
  district: string;
  /** One of the 36 official names in lib/india, or null when it could not be mapped. */
  state: IndianStateOrUT | null;
};

type PostOffice = {
  Name?: string;
  BranchType?: string;
  DeliveryStatus?: string;
  District?: string;
  State?: string;
};

type CacheEntry = { at: number; ttl: number; info: PincodeInfo | null };

const API_BASE = (process.env.PINCODE_API_URL || "https://api.postalpincode.in/pincode").replace(/\/+$/, "");
const TIMEOUT_MS = 3000;
const FOUND_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MISSING_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ENTRIES = 5000;

// Per server instance, survives hot reloads in dev.
const store = globalThis as unknown as { __caPincodeCache?: Map<string, CacheEntry> };
const cache = store.__caPincodeCache ?? (store.__caPincodeCache = new Map());

export class PincodeLookupError extends Error {
  constructor(
    message: string,
    public timedOut = false
  ) {
    super(message);
    this.name = "PincodeLookupError";
  }
}

function remember(pincode: string, info: PincodeInfo | null, ttl: number) {
  if (cache.size >= MAX_ENTRIES) {
    // Drop the oldest entry (Map keeps insertion order).
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(pincode, { at: Date.now(), ttl, info });
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  let best = "";
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

// "Mumbai ", "Bangalore G.P.O.", "Town Hall (Mumbai)" -> "Mumbai", "Bangalore", "Town Hall".
function cleanPlace(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+(?:G\.?\s?P\.?\s?O|H\.?\s?O|S\.?\s?O|B\.?\s?O)\.?$/i, "")
    .trim();
}

export function summarizePostOffices(pincode: string, offices: PostOffice[]): PincodeInfo | null {
  if (!offices.length) return null;

  const states = offices.map((office) => normalizeIndianState(office.State)).filter((s): s is IndianStateOrUT => Boolean(s));
  const state = (mostCommon(states) || null) as IndianStateOrUT | null;
  const inState = state ? offices.filter((office) => normalizeIndianState(office.State) === state) : offices;
  const district = cleanPlace(mostCommon(inState.map((office) => cleanPlace(office.District)).filter(Boolean)));

  // A head post office sits in the main town of its area (Kochi, Irinjalakuda,
  // New Delhi), so its name is the best "city". Sub offices are often
  // neighbourhoods, so without a head office the district is safer.
  const heads = inState.filter((office) => /head/i.test(String(office.BranchType || "")));
  const head =
    heads.find((office) => /^delivery$/i.test(String(office.DeliveryStatus || "").trim())) ?? heads[0];
  const city = cleanPlace(head?.Name) || district;

  if (!city && !state) return null;
  return { pincode, city, district, state };
}

/**
 * Looks a PIN code up (cached). Returns null when India Post has no record of
 * it; throws PincodeLookupError when the directory could not be reached.
 */
export async function lookupPincode(pincode: string): Promise<{ info: PincodeInfo | null; cached: boolean }> {
  const hit = cache.get(pincode);
  if (hit && Date.now() - hit.at < hit.ttl) return { info: hit.info, cached: true };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${pincode}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new PincodeLookupError(timedOut ? `timed out after ${TIMEOUT_MS} ms` : String((error as Error)?.message || error), timedOut);
  }

  if (!response.ok) throw new PincodeLookupError(`directory answered HTTP ${response.status}`);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PincodeLookupError("directory returned a body that is not JSON");
  }

  const entry = (Array.isArray(payload) ? payload[0] : payload) as
    | { Status?: string; PostOffice?: PostOffice[] | null }
    | undefined;
  const offices = Array.isArray(entry?.PostOffice) ? entry.PostOffice : [];

  if (String(entry?.Status || "") !== "Success" || !offices.length) {
    remember(pincode, null, MISSING_TTL_MS);
    return { info: null, cached: false };
  }

  const info = summarizePostOffices(pincode, offices);
  remember(pincode, info, info ? FOUND_TTL_MS : MISSING_TTL_MS);
  return { info, cached: false };
}
