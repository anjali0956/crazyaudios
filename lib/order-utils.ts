export const SHIPPING_FREE_THRESHOLD = Number.POSITIVE_INFINITY;
export const TAX_RATE = 18;
export const SHIPPING_ORIGIN_CITY = "Irinjalakuda";
export const SHIPPING_ORIGIN_STATE = "Kerala";

export type Address = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

type ShippingZone =
  | "local_city"
  | "kerala"
  | "south_nearby"
  | "west_central"
  | "north_east"
  | "remote";

type TaxZone = "intra_state" | "inter_state";

const SHIPPING_RATES: Record<ShippingZone, number> = {
  local_city: 40,
  kerala: 70,
  south_nearby: 110,
  west_central: 160,
  north_east: 220,
  remote: 280,
};

const STATE_ALIASES: Record<string, string> = {
  "andaman and nicobar": "andaman and nicobar islands",
  "andaman & nicobar": "andaman and nicobar islands",
  "andaman & nicobar islands": "andaman and nicobar islands",
  "dadra and nagar haveli": "dadra and nagar haveli and daman and diu",
  "daman and diu": "dadra and nagar haveli and daman and diu",
  "dadra & nagar haveli and daman & diu": "dadra and nagar haveli and daman and diu",
  "delhi ncr": "delhi",
  "j&k": "jammu and kashmir",
  "orissa": "odisha",
  "pondicherry": "puducherry",
  "uttaranchal": "uttarakhand",
};

const SOUTH_NEARBY_STATES = new Set([
  "tamil nadu",
  "karnataka",
  "andhra pradesh",
  "telangana",
  "goa",
  "lakshadweep",
  "puducherry",
]);

const WEST_CENTRAL_STATES = new Set([
  "maharashtra",
  "gujarat",
  "madhya pradesh",
  "chhattisgarh",
  "odisha",
  "west bengal",
  "jharkhand",
  "bihar",
]);

const NORTH_EAST_STATES = new Set([
  "uttar pradesh",
  "uttarakhand",
  "punjab",
  "haryana",
  "rajasthan",
  "himachal pradesh",
  "jammu and kashmir",
  "ladakh",
  "delhi",
  "chandigarh",
  "assam",
  "arunachal pradesh",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "sikkim",
  "tripura",
]);

const REMOTE_STATES = new Set([
  "andaman and nicobar islands",
  "ladakh",
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[.&,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeStateName(value: string) {
  const normalized = normalizeText(value);
  return STATE_ALIASES[normalized] || normalized;
}

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function validateAddress(address: Address) {
  const fields: Array<keyof Address> = [
    "name",
    "email",
    "phone",
    "address",
    "city",
    "state",
    "pincode",
  ];

  for (const field of fields) {
    if (!String(address[field] || "").trim()) {
      return `${field} is required`;
    }
  }

  return null;
}

export function normalizeCartItems(
  cartItems: Array<{ _id?: string; productId?: string; quantity?: number }>
) {
  return cartItems.map((item) => ({
    productId: String(item.productId || item._id || "").trim(),
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
  }));
}

export function getShippingZone(address?: Partial<Address> | null): ShippingZone {
  const city = normalizeText(String(address?.city || ""));
  const state = normalizeStateName(String(address?.state || ""));

  if (!state) {
    return "south_nearby";
  }

  if (city === normalizeText(SHIPPING_ORIGIN_CITY) && state === normalizeText(SHIPPING_ORIGIN_STATE)) {
    return "local_city";
  }

  if (state === normalizeText(SHIPPING_ORIGIN_STATE)) {
    return "kerala";
  }

  if (REMOTE_STATES.has(state)) {
    return "remote";
  }

  if (SOUTH_NEARBY_STATES.has(state)) {
    return "south_nearby";
  }

  if (WEST_CENTRAL_STATES.has(state)) {
    return "west_central";
  }

  if (NORTH_EAST_STATES.has(state)) {
    return "north_east";
  }

  return "west_central";
}

export function getShippingLabel(zone: ShippingZone) {
  switch (zone) {
    case "local_city":
      return "Irinjalakuda local delivery";
    case "kerala":
      return "Kerala delivery";
    case "south_nearby":
      return "Nearby South India delivery";
    case "west_central":
      return "West/Central/East India delivery";
    case "north_east":
      return "North/North-East India delivery";
    case "remote":
      return "Remote location delivery";
    default:
      return "Standard delivery";
  }
}

export function getTaxZone(address?: Partial<Address> | null): TaxZone {
  const state = normalizeStateName(String(address?.state || ""));
  return state === normalizeText(SHIPPING_ORIGIN_STATE) ? "intra_state" : "inter_state";
}

export function getTaxLabel(address?: Partial<Address> | null) {
  const zone = getTaxZone(address);
  return zone === "intra_state" ? "GST (CGST 9% + SGST 9%)" : "GST (IGST 18%)";
}

export function calculateShippingFee(subtotal: number, address?: Partial<Address> | null) {
  const roundedSubtotal = roundCurrency(subtotal);

  if (roundedSubtotal <= 0) {
    return {
      shippingFee: 0,
      shippingZone: "south_nearby" as ShippingZone,
      shippingLabel: "Standard delivery",
    };
  }

  if (roundedSubtotal >= SHIPPING_FREE_THRESHOLD) {
    const zone = getShippingZone(address);
    return {
      shippingFee: 0,
      shippingZone: zone,
      shippingLabel: `${getShippingLabel(zone)} (free shipping)`,
    };
  }

  const shippingZone = getShippingZone(address);
  return {
    shippingFee: SHIPPING_RATES[shippingZone],
    shippingZone,
    shippingLabel: getShippingLabel(shippingZone),
  };
}

export function calculateTotals(subtotal: number, address?: Partial<Address> | null) {
  const roundedSubtotal = roundCurrency(subtotal);
  const shipping = calculateShippingFee(roundedSubtotal, address);
  const taxAmount = roundCurrency((roundedSubtotal * TAX_RATE) / 100);
  const totalAmount = roundCurrency(roundedSubtotal + shipping.shippingFee + taxAmount);

  return {
    subtotal: roundedSubtotal,
    shippingFee: shipping.shippingFee,
    shippingZone: shipping.shippingZone,
    shippingLabel: shipping.shippingLabel,
    taxRate: TAX_RATE,
    taxLabel: getTaxLabel(address),
    taxAmount,
    totalAmount,
  };
}

export function buildReceipt() {
  return `CA-${Date.now()}`;
}

export function buildInvoiceNumber() {
  return `INV-${Date.now()}`;
}
