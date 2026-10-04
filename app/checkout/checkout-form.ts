// Checkout form model: fields, client validation (the same rules the server
// applies in lib/checkout-validation), the payload create-order expects, and
// the mapping of the server's fieldErrors back onto the form. Pure, client-safe.
import { normalizeIndianMobile, normalizePincode } from "@/lib/checkout-validation";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { normalizeIndianState } from "@/lib/india";
import type { Address } from "@/lib/order-utils";

export type AddressFields = {
  name: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
};

type AddressKey = keyof AddressFields;
export type Section = "delivery" | "billing";

export type CheckoutFormState = {
  phone: string;
  email: string;
  delivery: AddressFields;
  billingSame: boolean;
  billing: AddressFields;
  /** City/state values filled from the PIN lookup, so a new lookup may replace them but never typed values. */
  auto: Record<Section, { city: string; state: string }>;
};

export type FieldKey = "phone" | "email" | `${Section}.${AddressKey}`;
export type FieldErrors = Partial<Record<FieldKey, string>>;

export const EMPTY_ADDRESS: AddressFields = {
  name: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
};

export const EMPTY_FORM: CheckoutFormState = {
  phone: "",
  email: "",
  delivery: EMPTY_ADDRESS,
  billingSame: true,
  billing: EMPTY_ADDRESS,
  auto: { delivery: { city: "", state: "" }, billing: { city: "", state: "" } },
};

/** On-screen order: the first field with an error gets the focus. */
export const FIELD_ORDER: FieldKey[] = [
  "phone",
  "email",
  "delivery.pincode",
  "delivery.name",
  "delivery.line1",
  "delivery.line2",
  "delivery.landmark",
  "delivery.city",
  "delivery.state",
  "billing.pincode",
  "billing.name",
  "billing.line1",
  "billing.line2",
  "billing.city",
  "billing.state",
];

export function fieldId(key: FieldKey) {
  return `checkout-${key.replace(".", "-")}`;
}

const collapse = (value: string) => String(value || "").replace(/\s+/g, " ").trim();

/** Keeps digits only and drops a pasted/autofilled +91 or leading 0: "+91 98470 12345" -> "9847012345". */
export function cleanPhoneInput(raw: string) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length >= 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function cleanPincodeInput(raw: string) {
  return String(raw || "").replace(/\D/g, "").slice(0, 6);
}

/** The single address line the order stores: "12B Rose Villa, MG Road, Ernakulam North, Landmark: Near KSRTC stand". */
export function composeAddress(address: AddressFields) {
  const parts = [collapse(address.line1), collapse(address.line2)];
  const landmark = collapse(address.landmark);
  if (landmark) parts.push(`Landmark: ${landmark}`);
  return parts.filter(Boolean).join(", ");
}

function addressError(key: AddressKey, address: AddressFields): string | undefined {
  const value = collapse(address[key]);
  switch (key) {
    case "pincode":
      if (!value) return "Enter the 6-digit PIN code.";
      return normalizePincode(value) ? undefined : "Enter a valid 6-digit PIN code.";
    case "name":
      if (value.length < 2) return "Enter the full name.";
      return value.length > 80 ? "Use 80 characters or fewer." : undefined;
    case "line1":
      if (!value) return "Enter the house or flat number and street.";
      if (value.length > 200) return "Use 200 characters or fewer.";
      // The server needs at least 8 characters for the whole address.
      return composeAddress(address).length < 8 ? "Add a little more detail: house or flat number and street." : undefined;
    case "line2":
      return value.length < 2 ? "Enter the area or locality." : undefined;
    case "landmark":
      return undefined;
    case "city":
      if (value.length < 2) return "Enter the city or town.";
      return value.length > 60 ? "Use 60 characters or fewer." : undefined;
    case "state":
      return normalizeIndianState(value) ? undefined : "Choose the state.";
  }
}

export function validateField(key: FieldKey, form: CheckoutFormState): string | undefined {
  if (key === "phone") {
    if (!form.phone.trim()) return "Enter your 10-digit mobile number.";
    return normalizeIndianMobile(form.phone) ? undefined : "Enter a valid 10-digit mobile number.";
  }
  if (key === "email") {
    const email = normalizeEmail(form.email);
    if (!email) return "Enter your email address.";
    return isValidEmail(email) ? undefined : "Enter a valid email address, like name@gmail.com.";
  }
  const [section, field] = key.split(".") as [Section, AddressKey];
  if (section === "billing" && form.billingSame) return undefined;
  return addressError(field, form[section]);
}

export function validateForm(form: CheckoutFormState): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of FIELD_ORDER) {
    const message = validateField(key, form);
    if (message) errors[key] = message;
  }
  return errors;
}

export function firstErrorKey(errors: FieldErrors) {
  return FIELD_ORDER.find((key) => errors[key]);
}

/** The shippingAddress / billingAddress pair create-order validates (lib/checkout-validation). */
export function buildAddresses(form: CheckoutFormState): { shippingAddress: Address; billingAddress: Address } {
  const phone = normalizeIndianMobile(form.phone) || form.phone.trim();
  const email = normalizeEmail(form.email);
  const toAddress = (address: AddressFields): Address => ({
    name: collapse(address.name),
    email,
    phone,
    address: composeAddress(address),
    city: collapse(address.city),
    state: normalizeIndianState(address.state) || collapse(address.state),
    pincode: cleanPincodeInput(address.pincode),
  });
  const shippingAddress = toAddress(form.delivery);
  return { shippingAddress, billingAddress: form.billingSame ? shippingAddress : toAddress(form.billing) };
}

const SERVER_FIELDS: Record<string, "phone" | "email" | AddressKey> = {
  name: "name",
  email: "email",
  phone: "phone",
  address: "line1",
  city: "city",
  state: "state",
  pincode: "pincode",
};

/** create-order's 400 fieldErrors ({ "shippingAddress.phone": "…" }) -> form field keys. */
export function mapServerFieldErrors(fieldErrors: unknown, billingSame: boolean): FieldErrors {
  const out: FieldErrors = {};
  if (!fieldErrors || typeof fieldErrors !== "object") return out;
  for (const [serverKey, message] of Object.entries(fieldErrors as Record<string, unknown>)) {
    if (typeof message !== "string" || !message) continue;
    const [group, field] = serverKey.split(".");
    const target = SERVER_FIELDS[field];
    if (!target) continue;
    const key: FieldKey =
      target === "phone" || target === "email"
        ? target
        : `${group === "billingAddress" && !billingSame ? "billing" : "delivery"}.${target}`;
    if (!out[key]) out[key] = message;
  }
  return out;
}

// ---------------------------------------------------------------- saved details

const SAVED_KEY = "ca_checkout_details";

type SavedDetails = { phone?: string; email?: string; delivery?: Partial<AddressFields> };

/** Contact + delivery address from the last order on this device (never payment data). */
export function loadSavedDetails(): SavedDetails | null {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedDetails;
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

export function saveDetails(form: CheckoutFormState) {
  try {
    const { name, line1, line2, landmark, city, state, pincode } = form.delivery;
    const data: SavedDetails = {
      phone: form.phone,
      email: form.email.trim(),
      delivery: { name, line1, line2, landmark, city, state, pincode },
    };
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(data));
  } catch {
    // Storage blocked: the customer simply types it next time.
  }
}

/** Fills only empty fields from saved details. */
export function withSavedDetails(form: CheckoutFormState, saved: SavedDetails): CheckoutFormState {
  const pick = (current: string, value: unknown) => (current.trim() ? current : typeof value === "string" ? value : current);
  const delivery = { ...form.delivery };
  for (const key of Object.keys(EMPTY_ADDRESS) as AddressKey[]) {
    delivery[key] = pick(delivery[key], saved.delivery?.[key]);
  }
  // The <select> only knows the 36 official names.
  delivery.state = delivery.state ? normalizeIndianState(delivery.state) || "" : "";
  delivery.pincode = cleanPincodeInput(delivery.pincode);
  return {
    ...form,
    phone: cleanPhoneInput(pick(form.phone, saved.phone)),
    email: pick(form.email, saved.email),
    delivery,
  };
}
