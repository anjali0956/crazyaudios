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

type ShippingZone = "live_rate";

type TaxZone = "intra_state" | "inter_state";

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

export function getInclusivePrice(basePrice: number, taxRate = TAX_RATE) {
  return roundCurrency(basePrice * (1 + taxRate / 100));
}

export function extractInclusiveTaxAmount(inclusivePrice: number, taxRate = TAX_RATE) {
  return roundCurrency((inclusivePrice * taxRate) / (100 + taxRate));
}

export function getTaxableAmountFromInclusive(inclusivePrice: number, taxRate = TAX_RATE) {
  return roundCurrency(inclusivePrice - extractInclusiveTaxAmount(inclusivePrice, taxRate));
}

export function getDisplayPrice(basePrice: number, discountPercentage = 0, flashSale = false) {
  const normalizedDiscount = Math.max(0, Math.min(95, Number(discountPercentage) || 0));
  // Admin-entered product prices are already GST-inclusive.
  // We should display and discount that inclusive amount directly,
  // then extract GST later only for invoice/order breakdowns.
  const inclusiveBasePrice = roundCurrency(Number(basePrice) || 0);
  const inclusiveFinalPrice =
    flashSale && normalizedDiscount > 0
      ? roundCurrency(inclusiveBasePrice * (1 - normalizedDiscount / 100))
      : inclusiveBasePrice;

  return {
    inclusiveBasePrice,
    inclusiveFinalPrice,
  };
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
  return "live_rate";
}

export function getShippingLabel(zone: ShippingZone) {
  return "Live courier rate";
}

export function getTaxZone(address?: Partial<Address> | null): TaxZone {
  const state = normalizeStateName(String(address?.state || ""));
  return state === normalizeText(SHIPPING_ORIGIN_STATE) ? "intra_state" : "inter_state";
}

export function getTaxLabel(address?: Partial<Address> | null) {
  const zone = getTaxZone(address);
  return zone === "intra_state" ? "GST (CGST 9% + SGST 9%)" : "GST (IGST 18%)";
}

export function getTaxBreakdown(
  inclusivePrice: number,
  address?: Partial<Address> | null,
  taxRate = TAX_RATE
) {
  const zone = getTaxZone(address);
  const totalTaxAmount = extractInclusiveTaxAmount(inclusivePrice, taxRate);

  if (zone === "intra_state") {
    const halfTaxAmount = roundCurrency(totalTaxAmount / 2);
    return {
      zone,
      totalTaxAmount,
      cgstRate: roundCurrency(taxRate / 2),
      sgstRate: roundCurrency(taxRate / 2),
      cgstAmount: halfTaxAmount,
      sgstAmount: roundCurrency(totalTaxAmount - halfTaxAmount),
      igstRate: 0,
      igstAmount: 0,
    };
  }

  return {
    zone,
    totalTaxAmount,
    cgstRate: 0,
    sgstRate: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstRate: taxRate,
    igstAmount: totalTaxAmount,
  };
}

export function calculateShippingFee(
  subtotal: number,
  address?: Partial<Address> | null,
  shippingFeeOverride?: number | null,
  shippingLabelOverride?: string | null
) {
  const shippingZone = getShippingZone(address);
  return {
    shippingFee: roundCurrency(Number(shippingFeeOverride) || 0),
    shippingZone,
    shippingLabel: String(shippingLabelOverride || getShippingLabel(shippingZone)),
  };
}

export function calculateTotals(
  subtotal: number,
  address?: Partial<Address> | null,
  shippingFeeOverride?: number | null,
  shippingLabelOverride?: string | null
) {
  const roundedSubtotal = roundCurrency(subtotal);
  const shipping = calculateShippingFee(
    roundedSubtotal,
    address,
    shippingFeeOverride,
    shippingLabelOverride
  );
  const productTaxAmount = extractInclusiveTaxAmount(roundedSubtotal, TAX_RATE);
  const productTaxableAmount = getTaxableAmountFromInclusive(roundedSubtotal, TAX_RATE);
  const productTaxBreakdown = getTaxBreakdown(roundedSubtotal, address, TAX_RATE);
  const shippingTaxAmount = extractInclusiveTaxAmount(shipping.shippingFee, TAX_RATE);
  const shippingTaxableAmount = getTaxableAmountFromInclusive(shipping.shippingFee, TAX_RATE);
  const shippingTaxBreakdown = getTaxBreakdown(shipping.shippingFee, address, TAX_RATE);
  const taxAmount = roundCurrency(productTaxAmount + shippingTaxAmount);
  const taxableAmount = roundCurrency(productTaxableAmount + shippingTaxableAmount);
  const totalAmount = roundCurrency(roundedSubtotal + shipping.shippingFee);

  return {
    subtotal: roundedSubtotal,
    taxableAmount,
    productTaxableAmount,
    shippingFee: shipping.shippingFee,
    shippingTaxableAmount,
    shippingZone: shipping.shippingZone,
    shippingLabel: shipping.shippingLabel,
    taxRate: TAX_RATE,
    taxLabel: getTaxLabel(address),
    taxAmount,
    productTaxAmount,
    shippingTaxAmount,
    taxBreakdown: productTaxBreakdown,
    productTaxBreakdown,
    shippingTaxBreakdown,
    totalAmount,
  };
}

export function buildReceipt() {
  return `CA-${Date.now()}`;
}

export function buildInvoiceNumber() {
  return `INV-${Date.now()}`;
}
