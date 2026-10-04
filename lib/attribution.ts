export type OrderAttribution = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  fbclid: string;
  landingPage: string;
  referrer: string;
  capturedAt: string;
};

const STORAGE_KEY = "ca_attribution";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const URL_PARAMS: Array<[keyof OrderAttribution, string]> = [
  ["utmSource", "utm_source"],
  ["utmMedium", "utm_medium"],
  ["utmCampaign", "utm_campaign"],
  ["utmContent", "utm_content"],
  ["utmTerm", "utm_term"],
  ["fbclid", "fbclid"],
];

function clean(value: unknown, maxLength = 300) {
  return String(value ?? "").trim().slice(0, maxLength);
}

// Last-touch attribution: a visit that arrives with campaign parameters
// replaces what was stored; plain visits leave the stored source alone.
export function captureAttributionFromUrl() {
  if (typeof window === "undefined") return;

  try {
    const params = new URLSearchParams(window.location.search);
    const hasCampaignData = URL_PARAMS.some(([, param]) => params.get(param));
    if (!hasCampaignData) return;

    const attribution = {} as OrderAttribution;
    for (const [field, param] of URL_PARAMS) {
      attribution[field] = clean(params.get(param));
    }
    attribution.landingPage = clean(window.location.pathname + window.location.search, 500);
    attribution.referrer = clean(document.referrer, 500);
    attribution.capturedAt = new Date().toISOString();

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); attribution is best-effort.
  }
}

export function getStoredAttribution(): OrderAttribution | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored?.capturedAt) return null;
    if (Date.now() - new Date(stored.capturedAt).getTime() > MAX_AGE_MS) return null;
    return stored as OrderAttribution;
  } catch {
    return null;
  }
}

// Server side: never trust the client payload's shape or size.
export function sanitizeAttribution(input: unknown): OrderAttribution | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;

  const attribution: OrderAttribution = {
    utmSource: clean(source.utmSource),
    utmMedium: clean(source.utmMedium),
    utmCampaign: clean(source.utmCampaign),
    utmContent: clean(source.utmContent),
    utmTerm: clean(source.utmTerm),
    fbclid: clean(source.fbclid, 500),
    landingPage: clean(source.landingPage, 500),
    referrer: clean(source.referrer, 500),
    capturedAt: clean(source.capturedAt, 40),
  };

  const capturedAt = new Date(attribution.capturedAt);
  attribution.capturedAt = Number.isNaN(capturedAt.getTime()) ? "" : capturedAt.toISOString();

  const hasData = URL_PARAMS.some(([field]) => attribution[field]);
  return hasData ? attribution : null;
}
