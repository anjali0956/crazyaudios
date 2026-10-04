import { isValidEmail, normalizeEmail } from "@/lib/email";
import { normalizeIndianState } from "@/lib/india";
import type { Address } from "@/lib/order-utils";

export type FieldErrors = Record<string, string>;

// Accepts 98765 43210, +91 98765-43210, 91 9876543210 and 09876543210.
// Returns the bare 10-digit number, or null when it isn't an Indian mobile.
export function normalizeIndianMobile(value: unknown): string | null {
  let digits = String(value ?? "").replace(/[\s\-().]/g, "");
  if (digits.startsWith("+91")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("+")) {
    return null;
  }
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function normalizePincode(value: unknown): string | null {
  const pincode = String(value ?? "").replace(/\s/g, "");
  return /^[1-9]\d{5}$/.test(pincode) ? pincode : null;
}

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function validateAddressFields(input: unknown, prefix: string) {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const name = cleanText(source.name);
  if (name.length < 2 || name.length > 80) {
    errors[`${prefix}.name`] = "Enter the full name (2 to 80 characters).";
  }

  const email = normalizeEmail(source.email);
  if (!isValidEmail(email)) {
    errors[`${prefix}.email`] = "Enter a valid email address.";
  }

  const phone = normalizeIndianMobile(source.phone);
  if (!phone) {
    errors[`${prefix}.phone`] = "Enter a valid 10-digit Indian mobile number.";
  }

  const address = cleanText(source.address);
  if (address.length < 8) {
    errors[`${prefix}.address`] = "Enter the full address: house or flat, street and area.";
  } else if (address.length > 500) {
    errors[`${prefix}.address`] = "The address is too long (500 characters at most).";
  }

  const city = cleanText(source.city);
  if (city.length < 2 || city.length > 60) {
    errors[`${prefix}.city`] = "Enter the city or town.";
  }

  const state = normalizeIndianState(source.state);
  if (!state) {
    errors[`${prefix}.state`] = "Choose a valid Indian state or union territory.";
  }

  const pincode = normalizePincode(source.pincode);
  if (!pincode) {
    errors[`${prefix}.pincode`] = "Enter a valid 6-digit pincode.";
  }

  if (Object.keys(errors).length) return { errors };

  const normalized: Address = {
    name,
    email,
    phone: phone!,
    address,
    city,
    state: state!,
    pincode: pincode!,
  };
  return { address: normalized, errors };
}

export type CheckoutAddressResult =
  | { ok: true; shipping: Address; billing: Address }
  | { ok: false; error: string; fieldErrors: FieldErrors };

// Server-side checkout validation. Values come back normalised (trimmed,
// lowercase email, 10-digit phone, official state name) and must be the ones
// stored: the state decides CGST/SGST vs IGST. A missing billing address means
// "same as shipping".
export function validateCheckoutAddresses(
  shippingInput: unknown,
  billingInput: unknown
): CheckoutAddressResult {
  const shipping = validateAddressFields(shippingInput, "shippingAddress");
  const billing =
    billingInput === undefined || billingInput === null
      ? shipping
      : validateAddressFields(billingInput, "billingAddress");

  const fieldErrors: FieldErrors = { ...shipping.errors, ...billing.errors };
  const firstKey = Object.keys(fieldErrors)[0];

  if (firstKey || !shipping.address || !billing.address) {
    const section = firstKey?.startsWith("billingAddress") ? "billing" : "shipping";
    return {
      ok: false,
      error: `Please check your ${section} details: ${fieldErrors[firstKey] || "some fields are missing."}`,
      fieldErrors,
    };
  }

  return { ok: true, shipping: shipping.address, billing: billing.address };
}
