// Cart persistence: the same localStorage key ("cart") and item shape the
// cart and checkout pages have always used, so old carts keep working.
// Module-level store read through useSyncExternalStore; localStorage is only
// touched from effects and event handlers, never during render.
import { getDisplayPrice, roundCurrency } from "@/lib/order-utils";

export const CART_STORAGE_KEY = "cart";
/** Fired on window after this tab changes the cart (other tabs get "storage"). */
export const CART_EVENT = "cart:updated";

export type CartItem = {
  _id: string;
  name: string;
  image?: string;
  /** Unit price the customer pays, GST incl. (flash sale applied). */
  price: number;
  /** Unit price before any flash sale (the struck price). */
  originalPrice?: number;
  /** Units (a multiple of packSize for pack-only products). */
  quantity: number;
  packSize?: number | null;
  flashSale?: boolean;
  discountPercentage?: number;
  /** Stock when last seen; caps the quantity. */
  stock?: number;
  category?: string;
  // Older carts stored the whole product document; unknown fields are kept as-is.
  [key: string]: unknown;
};

/** What addItem() needs: the product as stored (raw GST-inclusive `price`). */
export type CartProductInput = {
  _id: string;
  name: string;
  /** Stored price (GST incl., before flash sale). */
  price: number;
  image?: string;
  stock?: number;
  packSize?: number | null;
  flashSale?: boolean;
  discountPercentage?: number;
  category?: string;
};

export type CartState = { items: CartItem[]; ready: boolean };

const EMPTY: CartItem[] = [];
const SERVER_STATE: CartState = { items: EMPTY, ready: false };

let state: CartState = SERVER_STATE;
let lastRaw: string | null | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function parse(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    return data
      .filter((item) => item && typeof item === "object" && item._id)
      .map((item) => ({
        ...item,
        _id: String(item._id),
        name: String(item.name ?? ""),
        price: Number(item.price) || 0,
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      }));
  } catch {
    return EMPTY;
  }
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): CartState {
  return state;
}

export function getServerSnapshot(): CartState {
  return SERVER_STATE;
}

/** Re-read localStorage (call from effects/events). Emits only on change. */
export function syncFromStorage() {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (state.ready && raw === lastRaw) return;
  lastRaw = raw;
  state = { items: parse(raw), ready: true };
  emit();
}

export function writeItems(items: CartItem[]) {
  const raw = JSON.stringify(items);
  lastRaw = raw;
  state = { items, ready: true };
  try {
    if (items.length) window.localStorage.setItem(CART_STORAGE_KEY, raw);
    else window.localStorage.removeItem(CART_STORAGE_KEY);
    lastRaw = items.length ? raw : null;
  } catch {
    // Storage blocked (private mode): the cart still works for this page view.
  }
  emit();
  try {
    window.dispatchEvent(new Event(CART_EVENT));
  } catch {}
}

/** Current items, reading storage first if nothing has synced yet. */
export function currentItems() {
  if (!state.ready && typeof window !== "undefined") syncFromStorage();
  return state.items;
}

// ------------------------------------------------------------ pure helpers

export function packStep(item: { packSize?: number | null }) {
  return Math.max(1, Math.floor(Number(item.packSize) || 1));
}

/** Largest quantity allowed: stock rounded down to whole packs (Infinity when stock unknown). */
export function maxQuantity(item: { stock?: number; packSize?: number | null }) {
  if (item.stock === undefined || item.stock === null || Number.isNaN(Number(item.stock))) return Number.POSITIVE_INFINITY;
  const step = packStep(item);
  return Math.max(0, Math.floor(Number(item.stock) / step) * step);
}

/** Snap a requested quantity to whole packs within [step, max]. */
export function normalizeQuantity(quantity: number, item: { stock?: number; packSize?: number | null }) {
  const step = packStep(item);
  const max = maxQuantity(item);
  const wanted = Math.max(step, Math.ceil(Math.max(1, Math.floor(Number(quantity) || 0)) / step) * step);
  return Math.min(wanted, max);
}

export function displayPrices(product: { price: number; flashSale?: boolean; discountPercentage?: number }) {
  return getDisplayPrice(Number(product.price) || 0, Number(product.discountPercentage) || 0, Boolean(product.flashSale));
}

export function cartTotals(items: CartItem[]) {
  let units = 0;
  let count = 0;
  let subtotal = 0;
  for (const item of items) {
    units += item.quantity;
    count += Math.max(1, Math.round(item.quantity / packStep(item)));
    subtotal += item.price * item.quantity;
  }
  return { units, count, lines: items.length, subtotal: roundCurrency(subtotal) };
}
