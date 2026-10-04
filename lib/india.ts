// Indian states and union territories, for address validation and the
// checkout state picker. Client-safe: no server imports.

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export const INDIAN_UNION_TERRITORIES = [
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type IndianStateOrUT =
  | (typeof INDIAN_STATES)[number]
  | (typeof INDIAN_UNION_TERRITORIES)[number];

// All 36, alphabetical: use this for a <select>/<datalist>.
// Plain .sort(): for these ASCII, capitalised names it gives exactly the
// localeCompare order, without setting up an ICU collator at import time
// (this module ships with the cart on every page).
export const INDIAN_STATES_AND_UTS: readonly IndianStateOrUT[] = [
  ...INDIAN_STATES,
  ...INDIAN_UNION_TERRITORIES,
].sort();

// Lowercase letters only: "Tamil Nadu", "tamilnadu" and "TAMIL-NADU" share a key.
function stateKey(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
}

const DNHDD = "Dadra and Nagar Haveli and Daman and Diu";
const ANDAMAN = "Andaman and Nicobar Islands";

// Common misspellings, old names, short forms and vehicle-registration codes.
const STATE_ALIASES: Record<string, IndianStateOrUT> = {
  kerela: "Kerala",
  kerla: "Kerala",
  keralam: "Kerala",
  kl: "Kerala",
  tn: "Tamil Nadu",
  tamilnad: "Tamil Nadu",
  tamilnaadu: "Tamil Nadu",
  orissa: "Odisha",
  odisa: "Odisha",
  od: "Odisha",
  or: "Odisha",
  pondicherry: "Puducherry",
  pondichery: "Puducherry",
  pondy: "Puducherry",
  py: "Puducherry",
  uttaranchal: "Uttarakhand",
  uttrakhand: "Uttarakhand",
  uttarkhand: "Uttarakhand",
  uk: "Uttarakhand",
  chattisgarh: "Chhattisgarh",
  chhatisgarh: "Chhattisgarh",
  chattisgadh: "Chhattisgarh",
  cg: "Chhattisgarh",
  telengana: "Telangana",
  tg: "Telangana",
  ts: "Telangana",
  maharastra: "Maharashtra",
  mh: "Maharashtra",
  karnatka: "Karnataka",
  karanataka: "Karnataka",
  ka: "Karnataka",
  gujrat: "Gujarat",
  gj: "Gujarat",
  rajastan: "Rajasthan",
  rj: "Rajasthan",
  harayana: "Haryana",
  hr: "Haryana",
  jharkand: "Jharkhand",
  jh: "Jharkhand",
  panjab: "Punjab",
  pb: "Punjab",
  bengal: "West Bengal",
  westbangal: "West Bengal",
  wb: "West Bengal",
  andhra: "Andhra Pradesh",
  ap: "Andhra Pradesh",
  arunachal: "Arunachal Pradesh",
  ar: "Arunachal Pradesh",
  himachal: "Himachal Pradesh",
  hp: "Himachal Pradesh",
  mp: "Madhya Pradesh",
  up: "Uttar Pradesh",
  br: "Bihar",
  ga: "Goa",
  mn: "Manipur",
  ml: "Meghalaya",
  mz: "Mizoram",
  nl: "Nagaland",
  sk: "Sikkim",
  tr: "Tripura",
  newdelhi: "Delhi",
  delhincr: "Delhi",
  nct: "Delhi",
  nctdelhi: "Delhi",
  nctofdelhi: "Delhi",
  nationalcapitalterritoryofdelhi: "Delhi",
  dl: "Delhi",
  jammukashmir: "Jammu and Kashmir",
  jandk: "Jammu and Kashmir",
  jk: "Jammu and Kashmir",
  ch: "Chandigarh",
  la: "Ladakh",
  ld: "Lakshadweep",
  andaman: ANDAMAN,
  andamanandnicobar: ANDAMAN,
  andamannicobar: ANDAMAN,
  andamannicobarislands: ANDAMAN,
  an: ANDAMAN,
  dadraandnagarhaveli: DNHDD,
  dadranagarhaveli: DNHDD,
  damananddiu: DNHDD,
  damandiu: DNHDD,
  dadranagarhavelidamandiu: DNHDD,
  dnhdd: DNHDD,
  dn: DNHDD,
  dd: DNHDD,
};

const STATE_LOOKUP = new Map<string, IndianStateOrUT>();
for (const name of INDIAN_STATES_AND_UTS) STATE_LOOKUP.set(stateKey(name), name);
for (const [alias, name] of Object.entries(STATE_ALIASES)) STATE_LOOKUP.set(alias, name);

// Returns the official name ("kerela" -> "Kerala"), or null when the value is
// not an Indian state or union territory.
export function normalizeIndianState(value: unknown): IndianStateOrUT | null {
  const key = stateKey(String(value ?? ""));
  if (!key) return null;
  return STATE_LOOKUP.get(key) ?? null;
}
