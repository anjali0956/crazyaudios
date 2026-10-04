import { qualifiesForFreeShipping } from "@/lib/shipping-policy";

export type ShippingRateRequest = {
  pickupPostcode: string;
  deliveryPostcode: string;
  weightKg: number;
  cod: boolean;
  // Product subtotal (incl. GST), used to decide free shipping.
  subtotal: number;
};

// A row from the courier rate API. Internal only: these are our cost prices
// (with COD the API's rate = freight + cod_charges) and never reach the storefront.
type ApiCourierRate = {
  courier_company_id: number;
  name: string;
  rate: number;
  freight_charge?: number;
  cod_charges?: number;
  other_charges?: number;
  rto_charges?: number;
  estimated_delivery_days?: string;
  etd?: string;
  rating?: number;
  is_surface?: boolean;
  cod_available?: boolean;
};

// A courier option as the customer sees it: customer prices only.
export type CourierRate = {
  courier_company_id: number;
  name: string;
  // Everything this courier adds to the order: shipping_fee + cod_fee.
  rate: number;
  // Shipping after free shipping, without the COD fee.
  shipping_fee: number;
  cod_fee: number;
  // Shipping this courier would cost without free shipping.
  full_rate: number;
  estimated_delivery_days?: string;
  etd?: string;
  rating?: number;
  is_surface?: boolean;
  cod_available?: boolean;
  estimated?: boolean;
};

export type ShippingQuote = {
  // Charged on top of the products: shippingFee + codFee, nothing else.
  shippingFee: number;
  codFee: number;
  // YYYY-MM-DD when the courier gives a delivery date.
  etaDate: string | null;
  courierName: string;
  // True when live rates were unavailable and the fallback table was used.
  estimated: boolean;
  freeShippingApplied: boolean;
  // Older fields, kept for existing callers.
  courierCompanyId: number;
  fullShippingFee: number;
  cod: boolean;
  codCharges: number;
  shippingLabel: string;
  estimatedDeliveryText: string;
  estimatedDeliveryDate: Date | null;
  weightKg: number;
  availableCouriers: CourierRate[];
};

// Errors the customer should see as-is (HTTP 400). Anything else is internal.
export class ShippingQuoteError extends Error {
  constructor(
    public code: "COD_UNAVAILABLE" | "NOT_SERVICEABLE" | "COURIER_UNAVAILABLE",
    message: string
  ) {
    super(message);
    this.name = "ShippingQuoteError";
  }
}

const SHIPPING_RATE_API_URL =
  process.env.KALLADA_SHIPPING_RATE_API_URL || "https://shipping-ui.kallada.me/api/rates";

export const SHIPPING_PICKUP_PINCODE = process.env.KALLADA_PICKUP_PINCODE || "680121";

const RATE_API_TIMEOUT_MS = 6000;

// Option id used when live rates are unavailable.
export const FALLBACK_COURIER_ID = -1;
const FALLBACK_ETA_TEXT = "3–6 days";

function roundWeight(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function adjustCourierPrice(value: number) {
  const rawRate = Number(value || 0);
  // Nothing to charge (free shipping on the cheapest courier): no handling uplift either.
  if (rawRate <= 0) return 0;
  const withBuffer = rawRate + 10;
  return Math.ceil(withBuffer / 5) * 5;
}

// ---------- shipment weight ----------

const SPEAKER_CATEGORY = /speaker|woofer|tweeter|full\s*range|pro\s*audio|radiator/i;
const MODULE_CATEGORY = /module|board|kit|brainsaudios/i;

// Per-unit weight assumed for a product whose weightGrams isn't set yet.
export function fallbackWeightGrams(category?: string | null) {
  const text = String(category || "");
  if (SPEAKER_CATEGORY.test(text)) return 1000;
  if (MODULE_CATEGORY.test(text)) return 150;
  return 50; // semiconductors, connectors, capacitors, resistors, ...
}

const weightWarnings = globalThis as unknown as { __caWeightWarnings?: Set<string> };
const warnedProducts = weightWarnings.__caWeightWarnings ?? (weightWarnings.__caWeightWarnings = new Set());

function warnMissingWeight(name: string, category: string, grams: number) {
  const key = `${name}|${category}`;
  if (warnedProducts.has(key)) return;
  warnedProducts.add(key);
  console.warn(
    `[shipping] "${name || "unknown product"}" (${category || "no category"}) has no weightGrams; ` +
      `assuming ${grams} g per unit. Set its weight in Admin.`
  );
}

export function estimateShipmentWeightKg(
  items: Array<{
    quantity?: number;
    weightGrams?: number | null;
    category?: string | null;
    name?: string | null;
  }>,
  minimumWeightKg = 0.1
) {
  const totalWeightKg = items.reduce((sum, item) => {
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const weightGrams = Number(item.weightGrams);

    if (item.weightGrams != null && Number.isFinite(weightGrams) && weightGrams > 0) {
      return sum + (weightGrams * quantity) / 1000;
    }

    const fallbackGrams = fallbackWeightGrams(item.category);
    warnMissingWeight(String(item.name || ""), String(item.category || ""), fallbackGrams);
    return sum + (fallbackGrams * quantity) / 1000;
  }, 0);

  return roundWeight(Math.max(minimumWeightKg, totalWeightKg));
}

// ---------- pricing ----------

function parseEstimatedDeliveryDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(date: Date | null) {
  if (!date) return null;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatShippingLabel(courier: CourierRate) {
  const parts = [courier.name];

  if (courier.etd) {
    parts.push(`ETA ${courier.etd}`);
  } else if (courier.estimated_delivery_days) {
    parts.push(`${courier.estimated_delivery_days} day delivery`);
  }

  return parts.join(" - ") + (courier.estimated ? " (estimated rate)" : "");
}

// With COD the rate API returns rate = freight + cod_charges. Free shipping
// covers the freight of the cheapest courier only: a faster courier costs the
// difference. The handling uplift is applied to the courier's total exactly as
// before, then split: shipping_fee is the freight part, cod_fee the rest, so a
// free-shipping COD order shows FREE shipping plus a separate COD fee.
function priceCouriers(
  couriers: ApiCourierRate[],
  { cod, subtotal }: { cod: boolean; subtotal: number }
): CourierRate[] {
  const eligible = cod ? couriers.filter((courier) => courier.cod_available !== false) : couriers;
  const freeShipping = qualifiesForFreeShipping(subtotal);
  const codChargesOf = (courier: ApiCourierRate) => (cod ? Number(courier.cod_charges || 0) : 0);
  const freightOf = (courier: ApiCourierRate) =>
    Math.max(0, Number(courier.rate || 0) - codChargesOf(courier));
  const cheapestFreight = eligible.length ? Math.min(...eligible.map(freightOf)) : 0;

  return eligible.map((courier) => {
    const customerFreight = freeShipping
      ? Math.max(0, freightOf(courier) - cheapestFreight)
      : freightOf(courier);
    const total = adjustCourierPrice(customerFreight + codChargesOf(courier));
    const shippingFee = adjustCourierPrice(customerFreight);
    const codFee = cod ? Math.max(0, total - shippingFee) : 0;

    return {
      courier_company_id: Number(courier.courier_company_id),
      name: String(courier.name || "Courier"),
      rate: shippingFee + codFee,
      shipping_fee: shippingFee,
      cod_fee: codFee,
      full_rate: adjustCourierPrice(freightOf(courier)),
      estimated_delivery_days: courier.estimated_delivery_days,
      etd: courier.etd,
      rating: Number(courier.rating || 0),
      is_surface: Boolean(courier.is_surface),
      cod_available: courier.cod_available !== false,
    };
  });
}

export function selectCourierRate(couriers: CourierRate[], selectedCourierCompanyId?: number | null) {
  if (!couriers.length) {
    throw new ShippingQuoteError(
      "NOT_SERVICEABLE",
      "Delivery is not available to this pincode yet. Please check the pincode or message us on WhatsApp."
    );
  }

  const selectedId = Number(selectedCourierCompanyId || 0);
  if (selectedId > 0) {
    const selected = couriers.find((courier) => Number(courier.courier_company_id) === selectedId);

    if (!selected) {
      throw new ShippingQuoteError(
        "COURIER_UNAVAILABLE",
        "The selected courier is no longer available for this pincode. Please choose another shipping option."
      );
    }

    return selected;
  }

  return [...couriers].sort((a, b) => a.rate - b.rate)[0];
}

function buildQuote(
  courier: CourierRate,
  couriers: CourierRate[],
  request: ShippingRateRequest,
  estimated: boolean
): ShippingQuote {
  const etaDate = parseEstimatedDeliveryDate(courier.etd);

  return {
    shippingFee: courier.shipping_fee,
    codFee: courier.cod_fee,
    etaDate: toIsoDate(etaDate),
    courierName: courier.name,
    estimated,
    freeShippingApplied: qualifiesForFreeShipping(request.subtotal),
    courierCompanyId: courier.courier_company_id,
    fullShippingFee: courier.full_rate,
    cod: request.cod,
    codCharges: courier.cod_fee,
    shippingLabel: formatShippingLabel(courier),
    estimatedDeliveryText: estimated
      ? FALLBACK_ETA_TEXT
      : courier.etd ||
        (courier.estimated_delivery_days ? `${courier.estimated_delivery_days} day delivery` : ""),
    estimatedDeliveryDate: etaDate,
    weightKg: request.weightKg,
    availableCouriers: couriers,
  };
}

// ---------- fallback when live rates are unavailable ----------

// Customer prices (incl. GST) by weight slab; serviceability unknown.
export function fallbackShippingFee(weightKg: number) {
  const weight = Math.max(0, Number(weightKg) || 0);
  if (weight <= 0.5) return 99;
  if (weight <= 1) return 149;
  if (weight <= 2) return 199;
  return 199 + 60 * Math.ceil(weight - 2 - 1e-9);
}

export function fallbackCodFee(subtotal: number) {
  return Math.ceil(Math.max(40, (Number(subtotal) || 0) * 0.02) / 5) * 5;
}

function fallbackQuote(request: ShippingRateRequest, reason: string): ShippingQuote {
  console.warn(
    `[shipping] Live courier rates unavailable (${reason}); using the fallback table ` +
      `for pincode ${request.deliveryPostcode}, ${request.weightKg} kg.`
  );

  const fullShippingFee = fallbackShippingFee(request.weightKg);
  const shippingFee = qualifiesForFreeShipping(request.subtotal) ? 0 : fullShippingFee;
  const codFee = request.cod ? fallbackCodFee(request.subtotal) : 0;
  const courier: CourierRate = {
    courier_company_id: FALLBACK_COURIER_ID,
    name: "Standard courier",
    rate: shippingFee + codFee,
    shipping_fee: shippingFee,
    cod_fee: codFee,
    full_rate: fullShippingFee,
    estimated_delivery_days: "3–6",
    etd: "",
    rating: 0,
    is_surface: true,
    cod_available: true,
    estimated: true,
  };

  return buildQuote(courier, [courier], request, true);
}

// ---------- live rates ----------

async function fetchLiveCouriers(request: ShippingRateRequest): Promise<ApiCourierRate[]> {
  if (!request.pickupPostcode) throw new Error("pickup pincode is not configured");

  const apiKey = process.env.KALLADA_SHIPPING_API_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RATE_API_TIMEOUT_MS);

  try {
    const response = await fetch(SHIPPING_RATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({
        pickup_postcode: request.pickupPostcode,
        delivery_postcode: request.deliveryPostcode,
        weight: request.weightKg,
        cod: request.cod,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`rate API answered HTTP ${response.status}`);
    if (!payload || !Array.isArray(payload.couriers)) throw new Error("rate API returned an unexpected body");
    return payload.couriers as ApiCourierRate[];
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`rate API timed out after ${RATE_API_TIMEOUT_MS} ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Live courier quote, or the fallback table when the rate API is down, slow
// or not configured. Throws ShippingQuoteError only for real answers the
// customer has to act on (no COD courier, pincode not served, courier gone).
export async function fetchShippingQuote(
  request: ShippingRateRequest,
  selectedCourierCompanyId?: number | null
): Promise<ShippingQuote> {
  let apiCouriers: ApiCourierRate[];
  try {
    apiCouriers = await fetchLiveCouriers(request);
  } catch (error) {
    return fallbackQuote(request, error instanceof Error ? error.message : String(error));
  }

  const couriers = priceCouriers(apiCouriers, request);

  if (request.cod && apiCouriers.length && !couriers.length) {
    throw new ShippingQuoteError("COD_UNAVAILABLE", "Cash on Delivery is not available for this pincode");
  }

  const selected = selectCourierRate(couriers, selectedCourierCompanyId);
  return buildQuote(selected, couriers, request, false);
}
