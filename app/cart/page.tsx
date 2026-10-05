"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FREE_SHIPPING_THRESHOLD,
  amountLeftForFreeShipping,
  formatRupees,
} from "@/lib/shipping-policy";

type CartItem = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  packSize?: number | null;
  image?: string;
  flashSale?: boolean;
  originalPrice?: number;
  discountPercentage?: number;
  stock?: number;
};

// One entry of POST /api/cart/validate.
type CheckedProduct = {
  productId: string;
  found: boolean;
  flashSale?: boolean;
  discountPercentage?: number;
  unitPrice?: number;
  originalUnitPrice?: number;
  stock?: number;
  packSize?: number | null;
};

type RemovedItem = { name: string; reason: "out of stock" | "no longer available" };

// The cart lives in localStorage ("cart"), in the shape the product pages
// write. It is read as an external store, so the first render matches the
// server's (empty) one and changes made here re-render the page.
const CART_KEY = "cart";
const CART_EVENT = "cart:updated";

function subscribeToCart(onChange: () => void) {
  window.addEventListener(CART_EVENT, onChange);
  return () => window.removeEventListener(CART_EVENT, onChange);
}

function readStoredCart() {
  try {
    return window.localStorage.getItem(CART_KEY) || "[]";
  } catch {
    return "[]";
  }
}

function parseCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter((item) => item && typeof item === "object") : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

const packStep = (item: { packSize?: number | null }) => Math.max(1, Number(item.packSize) || 1);

// Brings the stored cart in line with the live catalogue: today's prices,
// quantities capped at the stock left (whole packs), and products that are
// gone or sold out taken out. Items the check didn't cover stay as they are.
function reconcileCart(items: CartItem[], products: CheckedProduct[]) {
  const live = new Map(products.map((product) => [String(product.productId), product]));
  const next: CartItem[] = [];
  const removed: RemovedItem[] = [];
  let updated = false;

  for (const item of items) {
    const product = live.get(String(item._id));
    if (!product) {
      next.push(item);
      continue;
    }
    if (!product.found) {
      removed.push({ name: item.name, reason: "no longer available" });
      continue;
    }

    const packSize = product.packSize ?? null;
    const step = packStep({ packSize });
    const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
    const maxQuantity = Math.floor(stock / step) * step;
    if (maxQuantity < step) {
      removed.push({ name: item.name, reason: "out of stock" });
      continue;
    }

    const unitPrice = Number(product.unitPrice);
    const originalUnitPrice = Number(product.originalUnitPrice);
    const price = Number.isFinite(unitPrice) ? unitPrice : item.price;
    const quantity = Math.min(Math.max(Number(item.quantity) || step, step), maxQuantity);
    const fresh: CartItem = {
      ...item,
      price,
      originalPrice: Number.isFinite(originalUnitPrice) ? originalUnitPrice : item.originalPrice,
      flashSale: Boolean(product.flashSale),
      discountPercentage: Number(product.discountPercentage) || 0,
      packSize,
      stock,
      quantity,
    };
    if (
      Math.abs(price - Number(item.price)) > 0.004 ||
      quantity !== item.quantity ||
      packStep(fresh) !== packStep(item)
    ) {
      updated = true;
    }
    next.push(fresh);
  }

  return { items: next, removed, updated };
}

function describeCartChanges(updated: boolean, removed: RemovedItem[]) {
  const gone = removed.map((item) => `${item.name} (${item.reason})`).join(", ");
  if (!gone) return updated ? "We updated your cart with the latest prices and stock." : "";
  return updated
    ? `We updated your cart with the latest prices and stock. Removed: ${gone}.`
    : `Removed from your cart: ${gone}.`;
}

export default function CartPage() {
  // null on the server and until the browser cart has been read.
  const storedCart = useSyncExternalStore(subscribeToCart, readStoredCart, () => null);
  const cart = useMemo(() => parseCart(storedCart), [storedCart]);
  const cartLoaded = storedCart !== null;
  const [couponCode, setCouponCode] = useState("");
  const [cartNotice, setCartNotice] = useState("");

  // Once the cart has loaded, re-check its prices and stock with the server.
  useEffect(() => {
    if (!cartLoaded) return;
    const items = parseCart(readStoredCart());
    if (!items.length) return;

    const controller = new AbortController();
    fetch("/api/cart/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: items.map((item) => ({ productId: item._id, quantity: item.quantity })),
      }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { products?: CheckedProduct[] } | null) => {
        const products = data?.products;
        if (controller.signal.aborted || !Array.isArray(products)) return;
        // Apply to the cart as it is now (it may have changed meanwhile).
        const current = parseCart(readStoredCart());
        const result = reconcileCart(current, products);
        if (JSON.stringify(result.items) !== JSON.stringify(current)) saveCart(result.items);
        setCartNotice(describeCartChanges(result.updated, result.removed));
      })
      .catch(() => {
        // Offline or the check failed: keep the cart as it is. Prices and
        // stock are checked again when the order is placed.
      });
    return () => controller.abort();
  }, [cartLoaded]);

  const updateCart = (updatedCart: CartItem[]) => {
    saveCart(updatedCart);
  };

  const removeItem = (id: string) => {
    const updatedCart = cart.filter((item) => item._id !== id);
    updateCart(updatedCart);
  };

  const increaseQty = (id: string) => {
    const updatedCart = cart.map((item) =>
      item._id === id
        ? { ...item, quantity: item.quantity + Math.max(1, Number(item.packSize) || 1) }
        : item
    );
    updateCart(updatedCart);
  };

  const decreaseQty = (id: string) => {
    const updatedCart = cart.map((item) =>
      item._id === id && item.quantity > Math.max(1, Number(item.packSize) || 1)
        ? {
            ...item,
            quantity:
              item.quantity - Math.max(1, Number(item.packSize) || 1),
          }
        : item
    );
    updateCart(updatedCart);
  };

  const handleQtyInput = (id: string, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;

    const updatedCart = cart.map((item) => {
      if (item._id !== id) return item;
      const step = Math.max(1, Number(item.packSize) || 1);
      const safeQty = Math.max(step, Math.ceil(Math.floor(parsed) / step) * step);
      return { ...item, quantity: safeQty };
    });
    updateCart(updatedCart);
  };

  const getPackNote = (item: CartItem) => {
    const packSize = Math.max(0, Number(item.packSize) || 0);
    if (packSize <= 1) return null;
    return `Pack of ${packSize} only`;
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 text-black sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 text-sm text-gray-600">
          <Link href="/" className="hover:text-black">
            Home
          </Link>
          <span className="mx-2">{">"}</span>
          <span className="text-gray-800">Cart</span>
        </div>

        <h1 className="mb-6 text-center text-3xl font-medium text-gray-700 sm:mb-8 sm:text-4xl">Cart</h1>

        <div className="mb-6 rounded-sm bg-[#352f8f] px-4 py-4 text-sm text-white sm:mb-8 sm:px-6 sm:text-base">
          Complete your order and earn points for discounts on future purchases
        </div>

        {cartNotice ? (
          <p role="status" className="mb-4 text-sm font-medium text-orange-600">
            {cartNotice}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-sm border border-gray-300 bg-white">
          <div className="hidden grid-cols-12 items-center border-b border-gray-300 bg-gray-50 px-5 py-4 text-2xl text-gray-500 md:grid">
            <div className="col-span-6">Product</div>
            <div className="col-span-2 text-center">Price</div>
            <div className="col-span-2 text-center">Quantity</div>
            <div className="col-span-2 text-right">Subtotal</div>
          </div>

          {cart.length === 0 ? (
            <div className="p-8 text-center text-gray-600">Your cart is empty.</div>
          ) : (
            cart.map((item) => (
              <div key={item._id} className="border-b border-gray-300 px-4 py-5 md:px-5">
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12">
                  <div className="flex items-start gap-4 md:col-span-6">
                    <button
                      onClick={() => removeItem(item._id)}
                      className="mt-1 text-2xl leading-none text-gray-400 hover:text-red-500"
                      aria-label={`Remove ${item.name}`}
                    >
                      x
                    </button>
                    <div className="relative h-24 w-24 rounded border border-gray-200 bg-white">
                      <Image
                        src={item.image || "/logo.png"}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="pr-2">
                      <p className="text-lg leading-7 text-gray-700">{item.name}</p>
                      {getPackNote(item) ? (
                        <p className="mt-1 text-sm font-medium text-orange-600">{getPackNote(item)}</p>
                      ) : null}
                      {item.flashSale && (item.originalPrice || 0) > item.price && (
                        <p className="mt-1 text-sm text-red-600">Flash Sale Price Applied</p>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2 md:text-center">
                    <p className="mb-1 text-sm text-gray-500 md:hidden">Price</p>
                    <p className="text-xl text-gray-700 sm:text-3xl">Rs {item.price.toLocaleString("en-IN")}</p>
                  </div>

                  <div className="md:col-span-2 md:text-center">
                    <p className="mb-1 text-sm text-gray-500 md:hidden">Quantity</p>
                    <div className="inline-flex items-center rounded-md border border-gray-300">
                      <button
                        onClick={() => decreaseQty(item._id)}
                        className="h-10 w-10 text-xl text-gray-600 hover:bg-gray-100"
                        aria-label={`Decrease quantity for ${item.name}`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={Math.max(1, Number(item.packSize) || 1)}
                        step={Math.max(1, Number(item.packSize) || 1)}
                        value={item.quantity}
                        onChange={(e) => handleQtyInput(item._id, e.target.value)}
                        className="h-10 w-14 border-x border-gray-300 text-center outline-none"
                      />
                      <button
                        onClick={() => increaseQty(item._id)}
                        className="h-10 w-10 text-xl text-gray-600 hover:bg-gray-100"
                        aria-label={`Increase quantity for ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2 md:text-right">
                    <p className="mb-1 text-sm text-gray-500 md:hidden">Subtotal</p>
                    <p className="text-xl font-medium text-gray-700 sm:text-3xl">
                      Rs {(item.price * item.quantity).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="flex flex-col gap-4 px-4 py-4 md:px-5 md:py-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full max-w-xl flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-0">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Coupon code"
                className="h-12 flex-1 rounded-full border border-gray-300 px-5 outline-none sm:rounded-l-full sm:rounded-r-none"
              />
              <button className="h-12 rounded-full bg-slate-700 px-8 font-semibold text-white hover:bg-slate-800 sm:rounded-l-none sm:rounded-r-full">
                Apply coupon
              </button>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto">
              <button className="h-12 cursor-not-allowed rounded-full bg-gray-200 px-7 font-semibold text-gray-500">
                Update cart
              </button>
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-full border border-gray-300 bg-white px-7 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Continue Shopping
              </Link>
              <Link
                href="/checkout"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#352f8f] px-8 font-semibold text-white hover:bg-[#2b2578]"
              >
                Proceed to checkout
              </Link>
            </div>
          </div>
        </section>

        <section className="ml-auto mt-8 w-full max-w-md rounded-sm border border-gray-300 bg-white p-4 sm:mt-10 sm:p-6">
          <h2 className="mb-5 text-3xl font-medium text-gray-700 sm:text-4xl">Cart totals</h2>
          <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-lg">
            <span className="font-semibold text-gray-600">Total</span>
            <span className="text-2xl font-bold text-gray-800">Rs {total.toLocaleString("en-IN")}</span>
          </div>
          {FREE_SHIPPING_THRESHOLD > 0 && cart.length > 0 ? (
            <p className="mt-3 text-sm font-medium text-green-700">
              {amountLeftForFreeShipping(total) > 0
                ? `Add ${formatRupees(amountLeftForFreeShipping(total))} more to get free shipping`
                : "Free shipping applies to this order"}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
