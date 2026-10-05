// Add to Cart for the product page and the category page: the same
// localStorage "cart" item shape the product page has always written, the
// same quantity rules (whole packs, never more than stock) and the same
// Meta Pixel AddToCart event.
import { getDisplayPrice } from "@/lib/order-utils";
import { trackPixelEvent } from "@/lib/meta-pixel";

export type CartProduct = {
  _id: string;
  name: string;
  price: number;
  packSize?: number | null;
  flashSale?: boolean;
  discountPercentage?: number;
  stock?: number;
};

type StoredCartItem = {
  _id?: string;
  quantity?: number;
  [key: string]: unknown;
};

export type AddToCartResult = {
  /** Units actually added: 0 when the cart already holds all that can be bought. */
  added: number;
  /** Units of this product in the cart afterwards. */
  inCart: number;
  /** Most units that can be bought: stock in whole packs (Infinity when stock is unknown). */
  max: number;
};

/** Units per step: the pack size for pack-only products, otherwise 1. */
export function packStep(product: { packSize?: number | null }) {
  return Math.max(1, Number(product.packSize) || 1);
}

/** Stock rounded down to whole packs; no limit when the stock is unknown. */
export function maxCartQuantity(product: { stock?: number; packSize?: number | null }) {
  const stock = product.stock;
  if (typeof stock !== "number" || Number.isNaN(stock)) return Number.POSITIVE_INFINITY;
  const step = packStep(product);
  return Math.max(0, Math.floor(stock / step) * step);
}

/** Not even one unit (or one pack) can be bought. */
export function isOutOfStock(product: { stock?: number; packSize?: number | null }) {
  return maxCartQuantity(product) < packStep(product);
}

function readCart(): StoredCartItem[] {
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(window.localStorage.getItem("cart") || "[]");
  } catch {
    parsed = [];
  }
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Adds `quantity` units of `product`, capping the product's total in the cart
 * at its stock. The cart item and the Pixel payload match what the product
 * page has always sent; the Pixel reports the units actually added.
 */
export function addProductToCart(product: CartProduct, quantity: number): AddToCartResult {
  const cart = readCart();
  const existingItem = cart.find((item) => item._id === product._id);
  const inCartBefore = existingItem ? Math.max(0, Number(existingItem.quantity) || 0) : 0;
  const max = maxCartQuantity(product);
  const target = Math.min(inCartBefore + quantity, max);
  const added = target - inCartBefore;

  if (added <= 0) return { added: 0, inCart: inCartBefore, max };

  const finalPrice = getDisplayPrice(
    product.price,
    product.discountPercentage || 0,
    Boolean(product.flashSale)
  ).inclusiveFinalPrice;
  const originalDisplayPrice = getDisplayPrice(product.price).inclusiveBasePrice;

  if (existingItem) {
    existingItem.quantity = target;
    existingItem.price = finalPrice;
    existingItem.originalPrice = originalDisplayPrice;
    existingItem.flashSale = Boolean(product.flashSale);
    existingItem.discountPercentage = product.discountPercentage || 0;
    existingItem.packSize = product.packSize || null;
  } else {
    cart.push({
      ...product,
      price: finalPrice,
      originalPrice: originalDisplayPrice,
      flashSale: Boolean(product.flashSale),
      discountPercentage: product.discountPercentage || 0,
      quantity: target,
    });
  }

  // Not wrapped in try/catch on purpose: if the cart cannot be saved, the
  // shopper must not be told it was.
  window.localStorage.setItem("cart", JSON.stringify(cart));
  trackPixelEvent("AddToCart", {
    content_ids: [product._id],
    content_type: "product",
    content_name: product.name,
    contents: [{ id: product._id, quantity: added, item_price: finalPrice }],
    value: Number((finalPrice * added).toFixed(2)),
    currency: "INR",
  });

  return { added, inCart: target, max };
}

/** The alert after Add to Cart: unchanged when something was added. */
export function addToCartMessage(result: AddToCartResult) {
  if (result.added > 0 || !Number.isFinite(result.max)) return "Added to cart!";
  return `Only ${result.max} available. Your cart already has ${result.inCart}.`;
}
