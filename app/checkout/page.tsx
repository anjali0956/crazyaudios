"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { SHIPPING_FEE, SHIPPING_FREE_THRESHOLD, TAX_RATE, roundCurrency } from "@/lib/order-utils";

type CartItem = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
};

type AddressState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      on: (event: string, callback: (response: unknown) => void) => void;
      open: () => void;
    };
  }
}

const emptyAddress: AddressState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [shipping, setShipping] = useState<AddressState>(emptyAddress);
  const [billing, setBilling] = useState<AddressState>(emptyAddress);
  const [sameAsShipping, setSameAsShipping] = useState(false);

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]") as CartItem[];
    setCart(storedCart);
  }, []);

  useEffect(() => {
    if (sameAsShipping) {
      setBilling(shipping);
    }
  }, [sameAsShipping, shipping]);

  const subtotal = useMemo(
    () => roundCurrency(cart.reduce((sum, item) => sum + item.price * item.quantity, 0)),
    [cart]
  );
  const shippingFee =
    subtotal > 0 && subtotal < SHIPPING_FREE_THRESHOLD ? SHIPPING_FEE : 0;
  const taxAmount = roundCurrency((subtotal * TAX_RATE) / 100);
  const grandTotal = roundCurrency(subtotal + shippingFee + taxAmount);

  const handleSameAddress = (checked: boolean) => {
    setSameAsShipping(checked);

    if (checked) {
      setBilling(shipping);
    } else {
      setBilling(emptyAddress);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cart.length) {
      setErrorMessage("Your cart is empty");
      return;
    }

    setErrorMessage("");
    setIsPaying(true);

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay checkout");
      }

      const orderRes = await axios.post("/api/create-order", {
        cartItems: cart.map((item) => ({
          productId: item._id,
          quantity: item.quantity,
        })),
        shippingAddress: shipping,
        billingAddress: sameAsShipping ? shipping : billing,
      });

      const order = orderRes.data;

      const razorpay = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "CrazyAudios",
        description: "Order Payment",
        order_id: order.order_id,
        handler: async (response: Record<string, string>) => {
          try {
            const verifyRes = await axios.post("/api/verify-payment", {
              ...response,
              internal_order_id: order.internal_order_id,
            });

            if (verifyRes.data?.success) {
              localStorage.removeItem("cart");
              setCart([]);
              router.push(
                `/checkout/success?order=${encodeURIComponent(
                  verifyRes.data.orderId
                )}&receipt=${encodeURIComponent(verifyRes.data.receipt)}`
              );
            } else {
              setErrorMessage("Payment verification failed");
            }
          } catch (error: any) {
            setErrorMessage(
              error?.response?.data?.error || "Payment verification failed"
            );
          } finally {
            setIsPaying(false);
          }
        },
        prefill: {
          name: shipping.name,
          email: shipping.email,
          contact: shipping.phone,
        },
        notes: {
          shipping_address: shipping.address,
          shipping_city: shipping.city,
          shipping_state: shipping.state,
          shipping_pincode: shipping.pincode,
        },
        theme: {
          color: "#000000",
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
            setErrorMessage("Payment was cancelled");
          },
        },
      });

      razorpay.on("payment.failed", (response: any) => {
        setIsPaying(false);
        setErrorMessage(
          response?.error?.description || "Payment failed. Please try again."
        );
      });

      razorpay.open();
    } catch (error: any) {
      setIsPaying(false);
      setErrorMessage(
        error?.response?.data?.error || error?.message || "Failed to start payment"
      );
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-black sm:p-6 lg:p-10">
      {errorMessage && (
        <div className="mx-auto mb-4 max-w-5xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {errorMessage}
        </div>
      )}

      <h1 className="mb-6 text-2xl font-bold sm:mb-8 sm:text-3xl">Checkout</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-10">
        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <h2 className="mb-4 text-xl font-semibold">Shipping Details</h2>

          <form className="space-y-4" onSubmit={handlePayment}>
            <input
              type="text"
              placeholder="Full Name"
              value={shipping.name}
              onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
              className="w-full min-h-11 rounded border p-2"
              required
            />

            <input
              type="email"
              placeholder="Email Address"
              value={shipping.email}
              onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
              className="w-full min-h-11 rounded border p-2"
              required
            />

            <input
              type="tel"
              placeholder="Phone Number"
              value={shipping.phone}
              onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
              className="w-full min-h-11 rounded border p-2"
              required
            />

            <textarea
              placeholder="Full Address"
              value={shipping.address}
              onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
              className="w-full rounded border p-2"
              rows={3}
              required
            />

            <input
              type="text"
              placeholder="City"
              value={shipping.city}
              onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
              className="w-full min-h-11 rounded border p-2"
              required
            />

            <input
              type="text"
              placeholder="State"
              value={shipping.state}
              onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
              className="w-full min-h-11 rounded border p-2"
              required
            />

            <input
              type="text"
              placeholder="Pincode"
              value={shipping.pincode}
              onChange={(e) => setShipping({ ...shipping, pincode: e.target.value })}
              className="w-full min-h-11 rounded border p-2"
              required
            />

            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={sameAsShipping}
                onChange={(e) => handleSameAddress(e.target.checked)}
              />
              <label>Billing address same as shipping</label>
            </div>

            <div className="mt-6">
              <h2 className="mb-4 text-xl font-semibold">Billing Details</h2>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={billing.name}
                  onChange={(e) => setBilling({ ...billing, name: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full min-h-11 rounded border p-2 disabled:bg-gray-100"
                  required={!sameAsShipping}
                />

                <input
                  type="email"
                  placeholder="Email Address"
                  value={billing.email}
                  onChange={(e) => setBilling({ ...billing, email: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full min-h-11 rounded border p-2 disabled:bg-gray-100"
                  required={!sameAsShipping}
                />

                <input
                  type="text"
                  placeholder="Phone Number"
                  value={billing.phone}
                  onChange={(e) => setBilling({ ...billing, phone: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full min-h-11 rounded border p-2 disabled:bg-gray-100"
                  required={!sameAsShipping}
                />

                <textarea
                  placeholder="Full Address"
                  value={billing.address}
                  onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full rounded border p-2 disabled:bg-gray-100"
                  rows={3}
                  required={!sameAsShipping}
                />

                <input
                  type="text"
                  placeholder="City"
                  value={billing.city}
                  onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full min-h-11 rounded border p-2 disabled:bg-gray-100"
                  required={!sameAsShipping}
                />

                <input
                  type="text"
                  placeholder="State"
                  value={billing.state}
                  onChange={(e) => setBilling({ ...billing, state: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full min-h-11 rounded border p-2 disabled:bg-gray-100"
                  required={!sameAsShipping}
                />

                <input
                  type="text"
                  placeholder="Pincode"
                  value={billing.pincode}
                  onChange={(e) => setBilling({ ...billing, pincode: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full min-h-11 rounded border p-2 disabled:bg-gray-100"
                  required={!sameAsShipping}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPaying}
              className="mt-6 w-full rounded-lg bg-black py-3 text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPaying ? "Opening Razorpay..." : "Continue to Payment"}
            </button>
          </form>
        </div>

        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <h2 className="mb-4 text-xl font-semibold">Order Summary</h2>

          {cart.map((item) => (
            <div
              key={item._id}
              className="flex justify-between gap-4 border-b py-2 text-sm sm:text-base"
            >
              <span>
                {item.name} × {item.quantity}
              </span>

              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}

          <div className="mt-4 space-y-2 text-sm sm:text-base">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Courier</span>
              <span>{shippingFee === 0 ? "Free" : `₹${shippingFee}`}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({TAX_RATE}%)</span>
              <span>₹{taxAmount}</span>
            </div>
          </div>

          <div className="mt-4 flex justify-between border-t pt-4 text-lg font-semibold">
            <span>Total</span>
            <span>₹{grandTotal}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
