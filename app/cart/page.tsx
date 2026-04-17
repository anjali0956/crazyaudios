"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type CartItem = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  flashSale?: boolean;
  originalPrice?: number;
};

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState("");

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]") as CartItem[];
    setCart(storedCart);
  }, []);

  const updateCart = (updatedCart: CartItem[]) => {
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  const removeItem = (id: string) => {
    const updatedCart = cart.filter((item) => item._id !== id);
    updateCart(updatedCart);
  };

  const increaseQty = (id: string) => {
    const updatedCart = cart.map((item) =>
      item._id === id ? { ...item, quantity: item.quantity + 1 } : item
    );
    updateCart(updatedCart);
  };

  const decreaseQty = (id: string) => {
    const updatedCart = cart.map((item) =>
      item._id === id && item.quantity > 1
        ? { ...item, quantity: item.quantity - 1 }
        : item
    );
    updateCart(updatedCart);
  };

  const handleQtyInput = (id: string, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;

    const safeQty = Math.max(1, Math.floor(parsed));
    const updatedCart = cart.map((item) =>
      item._id === id ? { ...item, quantity: safeQty } : item
    );
    updateCart(updatedCart);
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
                        min={1}
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
        </section>
      </div>
    </main>
  );
}
