export const SHIPPING_FEE = 0;
export const SHIPPING_FREE_THRESHOLD = 3000;
export const TAX_RATE = 0;

export type Address = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

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

export function calculateTotals(subtotal: number) {
  const roundedSubtotal = roundCurrency(subtotal);
  const shippingFee =
    roundedSubtotal > 0 && roundedSubtotal < SHIPPING_FREE_THRESHOLD ? SHIPPING_FEE : 0;
  const taxAmount = roundCurrency((roundedSubtotal * TAX_RATE) / 100);
  const totalAmount = roundCurrency(roundedSubtotal + shippingFee + taxAmount);

  return {
    subtotal: roundedSubtotal,
    shippingFee,
    taxRate: TAX_RATE,
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
