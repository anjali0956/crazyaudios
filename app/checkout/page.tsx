"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  TAX_RATE,
  extractInclusiveTaxAmount,
  getTaxBreakdown,
  getTaxLabel,
  getTaxableAmountFromInclusive,
  roundCurrency,
} from "@/lib/order-utils";

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

type ShippingQuote = {
  courierCompanyId: number;
  shippingFee: number;
  baseShippingFee: number;
  shippingLabel: string;
  courierName: string;
  estimatedDeliveryText: string;
  estimatedDeliveryDate: string | null;
  weightKg: number;
  availableCouriers?: Array<{
    courier_company_id: number;
    name: string;
    rate: number;
    base_rate?: number;
    estimated_delivery_days?: string;
    etd?: string;
    rating?: number;
    cod_available?: boolean;
  }>;
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
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");
  const [selectedCourierCompanyId, setSelectedCourierCompanyId] = useState<number | null>(null);

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
  const taxLabel = useMemo(() => getTaxLabel(shipping), [shipping]);
  const shippingFee = shippingQuote?.shippingFee || 0;
  const taxAmount = extractInclusiveTaxAmount(subtotal, TAX_RATE);
  const taxableAmount = getTaxableAmountFromInclusive(subtotal, TAX_RATE);
  const taxBreakdown = useMemo(() => getTaxBreakdown(subtotal, shipping, TAX_RATE), [subtotal, shipping]);
  const grandTotal = roundCurrency(subtotal + shippingFee);

  useEffect(() => {
    const cleanPincode = String(shipping.pincode || "").replace(/\D/g, "");

    if (!cart.length || subtotal <= 0 || cleanPincode.length !== 6) {
      setShippingQuote(null);
      setSelectedCourierCompanyId(null);
      setShippingLoading(false);
      setShippingError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setShippingLoading(true);
        setShippingError("");

        const res = await axios.post(
          "/api/shipping-rate",
          {
            deliveryPostcode: cleanPincode,
            cartItems: cart.map((item) => ({
              productId: item._id,
              quantity: item.quantity,
            })),
            cod: false,
            selectedCourierCompanyId,
          },
          { signal: controller.signal }
        );

        setShippingQuote(res.data);
        setSelectedCourierCompanyId(Number(res.data?.courierCompanyId || 0) || null);
      } catch (error: any) {
        if (axios.isCancel(error) || error?.name === "CanceledError") return;
        setShippingQuote(null);
        setShippingError(
          error?.response?.data?.error || "Unable to fetch live courier rate right now"
        );
      } finally {
        setShippingLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [cart, selectedCourierCompanyId, shipping.pincode, subtotal]);

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

    if (!shippingQuote || !selectedCourierCompanyId) {
      setErrorMessage("Please wait for courier options and select a shipping service");
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
        selectedCourierCompanyId,
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
          courier_name: shippingQuote.courierName,
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

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Courier charge to {shipping.city || "your city"}, {shipping.state || "your state"}:{" "}
              <strong>{shippingLoading ? "Calculating..." : `Rs ${shippingFee}`}</strong>
              <div className="mt-1 text-xs text-blue-700">
                {shippingError
                  ? shippingError
                  : shippingQuote?.shippingLabel || "Enter a valid 6-digit pincode to fetch live courier rates"}
              </div>
              {shippingQuote && !shippingError ? (
                <div className="mt-1 text-xs text-blue-700">
                  Base courier {`Rs ${shippingQuote.baseShippingFee}`} + handling uplift ={" "}
                  <strong>{`Rs ${shippingQuote.shippingFee}`}</strong>
                </div>
              ) : null}
              {shippingQuote?.courierName ? (
                <div className="mt-1 text-xs text-blue-700">
                  Selected courier: {shippingQuote.courierName}
                  {shippingQuote.estimatedDeliveryText
                    ? ` - ${shippingQuote.estimatedDeliveryText}`
                    : ""}
                </div>
              ) : null}
            </div>

            {shippingQuote?.availableCouriers?.length ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Choose shipping service</h3>
                  <p className="text-xs text-gray-500">
                    Pick the courier that matches your preferred estimated day of delivery.
                  </p>
                </div>
                <div className="space-y-3">
                  {shippingQuote.availableCouriers.map((courier) => {
                    const isSelected =
                      Number(selectedCourierCompanyId) === Number(courier.courier_company_id);
                    return (
                      <button
                        key={courier.courier_company_id}
                        type="button"
                        onClick={() => setSelectedCourierCompanyId(courier.courier_company_id)}
                        className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                          isSelected
                            ? "border-blue-700 bg-blue-50 ring-2 ring-blue-100"
                            : "border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{courier.name}</p>
                            <p className="text-sm text-gray-600">
                              {courier.etd
                                ? `Estimated delivery: ${courier.etd}`
                                : courier.estimated_delivery_days
                                  ? `${courier.estimated_delivery_days} day delivery`
                                  : "ETA unavailable"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">Rs {courier.rate}</p>
                            {courier.base_rate ? (
                              <p className="text-xs text-gray-500">Base Rs {courier.base_rate}</p>
                            ) : null}
                            <p className="text-xs text-gray-500">
                              {courier.rating ? `Rating ${courier.rating}` : "Prepaid"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

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
              disabled={isPaying || shippingLoading || !shippingQuote || !selectedCourierCompanyId}
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
                {item.name} x {item.quantity}
              </span>
              <span>Rs {roundCurrency(item.price * item.quantity)}</span>
            </div>
          ))}

          <div className="mt-4 space-y-2 text-sm sm:text-base">
            <div className="flex justify-between">
              <span>Products Total (incl. GST)</span>
              <span>Rs {subtotal}</span>
            </div>
            <div className="flex justify-between">
              <div>
                <span>Product Value (before GST)</span>
              </div>
              <span>Rs {taxableAmount}</span>
            </div>
            <div className="flex justify-between">
              <div>
                <span>Courier</span>
                <p className="text-xs text-gray-500">
                  {shippingError
                    ? shippingError
                    : shippingQuote?.shippingLabel || "Live courier rate pending"}
                </p>
              </div>
              <span>{shippingLoading ? "..." : `Rs ${shippingFee}`}</span>
            </div>
            <div className="flex justify-between">
              <div>
                <span>GST Included ({TAX_RATE}%)</span>
                <p className="text-xs text-gray-500">{taxLabel}</p>
                {taxBreakdown.zone === "intra_state" ? (
                  <p className="text-xs text-gray-500">
                    CGST ({taxBreakdown.cgstRate}%): Rs {taxBreakdown.cgstAmount} + SGST ({taxBreakdown.sgstRate}%): Rs {taxBreakdown.sgstAmount}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    IGST ({taxBreakdown.igstRate}%): Rs {taxBreakdown.igstAmount}
                  </p>
                )}
              </div>
              <span>Rs {taxAmount}</span>
            </div>
          </div>

          <div className="mt-4 flex justify-between border-t pt-4 text-lg font-semibold">
            <span>Total</span>
            <span>Rs {grandTotal}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
