export type ShippingRateRequest = {
  pickupPostcode: string;
  deliveryPostcode: string;
  weightKg: number;
  cod: boolean;
};

export type CourierRate = {
  courier_company_id: number;
  name: string;
  rate: number;
  freight_charge: number;
  cod_charges: number;
  other_charges: number;
  rto_charges: number;
  estimated_delivery_days?: string;
  etd?: string;
  rating?: number;
  is_surface?: boolean;
  cod_available?: boolean;
  city?: string;
  state?: string;
};

export type ShippingRateResponse = {
  count: number;
  couriers: CourierRate[];
};

export type ShippingQuote = {
  courierCompanyId: number;
  shippingFee: number;
  shippingLabel: string;
  courierName: string;
  estimatedDeliveryText: string;
  estimatedDeliveryDate: Date | null;
  weightKg: number;
  availableCouriers: CourierRate[];
};

const SHIPPING_RATE_API_URL =
  process.env.KALLADA_SHIPPING_RATE_API_URL || "https://shipping-ui.kallada.me/api/rates";

export const SHIPPING_PICKUP_PINCODE = process.env.KALLADA_PICKUP_PINCODE || "680121";

const DEFAULT_WEIGHT_PER_UNSET_ITEM_KG = 0.35;

function roundWeight(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function estimateShipmentWeightKg(
  items: Array<{ quantity?: number; weightGrams?: number | null }>,
  minimumWeightKg = 0.5
) {
  const totalWeightKg = items.reduce((sum, item) => {
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const weightGrams = Number(item.weightGrams);

    if (Number.isFinite(weightGrams) && weightGrams > 0) {
      return sum + (weightGrams * quantity) / 1000;
    }

    return sum + DEFAULT_WEIGHT_PER_UNSET_ITEM_KG * quantity;
  }, 0);

  return roundWeight(Math.max(minimumWeightKg, totalWeightKg));
}

function parseEstimatedDeliveryDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShippingLabel(courier: CourierRate) {
  const parts = [courier.name];

  if (courier.etd) {
    parts.push(`ETA ${courier.etd}`);
  } else if (courier.estimated_delivery_days) {
    parts.push(`${courier.estimated_delivery_days} day delivery`);
  }

  return parts.join(" - ");
}

function normalizeCourierRate(courier: CourierRate) {
  return {
    ...courier,
    rate: Number(courier.rate || 0),
    freight_charge: Number(courier.freight_charge || 0),
    cod_charges: Number(courier.cod_charges || 0),
    other_charges: Number(courier.other_charges || 0),
    rto_charges: Number(courier.rto_charges || 0),
    rating: Number(courier.rating || 0),
  };
}

export function selectCourierRate(
  couriers: CourierRate[],
  selectedCourierCompanyId?: number | null
) {
  if (!couriers.length) {
    throw new Error("No courier rates available for this delivery pincode");
  }

  if (selectedCourierCompanyId) {
    const selected = couriers.find(
      (courier) => Number(courier.courier_company_id) === Number(selectedCourierCompanyId)
    );

    if (!selected) {
      throw new Error("Selected courier is no longer available for this pincode");
    }

    return selected;
  }

  return [...couriers].sort((a, b) => a.rate - b.rate)[0];
}

export async function fetchShippingQuote(
  request: ShippingRateRequest,
  selectedCourierCompanyId?: number | null
): Promise<ShippingQuote> {
  const apiKey = process.env.KALLADA_SHIPPING_API_KEY;

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
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error || payload?.message || `Shipping rate request failed (${response.status})`;
    throw new Error(message);
  }

  const couriers = Array.isArray(payload?.couriers)
    ? (payload.couriers as CourierRate[]).map(normalizeCourierRate)
    : [];

  const bestCourier = selectCourierRate(couriers, selectedCourierCompanyId);

  return {
    courierCompanyId: bestCourier.courier_company_id,
    shippingFee: bestCourier.rate,
    shippingLabel: formatShippingLabel(bestCourier),
    courierName: bestCourier.name,
    estimatedDeliveryText:
      bestCourier.etd ||
      (bestCourier.estimated_delivery_days
        ? `${bestCourier.estimated_delivery_days} day delivery`
        : ""),
    estimatedDeliveryDate: parseEstimatedDeliveryDate(bestCourier.etd),
    weightKg: request.weightKg,
    availableCouriers: couriers,
  };
}
