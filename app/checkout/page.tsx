"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  TAX_RATE,
  extractInclusiveTaxAmount,
  getTaxBreakdown,
  getTaxLabel,
  roundCurrency,
} from "@/lib/order-utils";
import {
  COD_ENABLED,
  COD_MAX_ORDER_VALUE,
  FREE_SHIPPING_THRESHOLD,
  type PaymentMethod,
  amountLeftForFreeShipping,
  formatRupees,
  isCodAllowed,
} from "@/lib/shipping-policy";
import {
  LAST_PURCHASE_STORAGE_KEY,
  type StoredPurchase,
  getPurchaseEventId,
  trackPixelEvent,
} from "@/lib/meta-pixel";
import { getStoredAttribution } from "@/lib/attribution";
import { INDIAN_STATES_AND_UTS } from "@/lib/india";
import { PENDING_ORDER_KEY, SAVED_CHECKOUT_FORM_KEY } from "./success/ClearPaidCart";

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
  // Shipping without the COD fee; the order total is products + shippingFee + codFee.
  shippingFee: number;
  codFee?: number;
  estimated?: boolean;
  etaDate?: string | null;
  fullShippingFee?: number;
  freeShippingApplied?: boolean;
  cod?: boolean;
  shippingLabel: string;
  courierName: string;
  estimatedDeliveryText: string;
  estimatedDeliveryDate: string | null;
  weightKg: number;
  availableCouriers?: Array<{
    courier_company_id: number;
    name: string;
    rate: number;
    shipping_fee?: number;
    cod_fee?: number;
    full_rate?: number;
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

// Instagram and Facebook in-app browsers: Razorpay's in-page modal often dies
// when the customer switches to a UPI app and back, so there Razorpay opens in
// redirect mode and posts the result to /api/razorpay/callback instead.
function isInAppBrowser() {
  return /FBAN|FBAV|Instagram/i.test(window.navigator.userAgent);
}

// /api/razorpay/callback sends a payment that didn't complete back to
// /checkout?payment=failed&reason=…. Only these fixed messages are shown.
function paymentReturnMessage(reason: string | null) {
  if (reason === "cancelled") return "Payment was cancelled";
  if (reason === "verify") {
    return "We couldn't verify your payment. If money was deducted, please contact us before paying again.";
  }
  return "Payment failed. Please try again.";
}

function readSavedAddress(value: unknown): AddressState {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const address = { ...emptyAddress };
  for (const key of Object.keys(address) as Array<keyof AddressState>) {
    const field = source[key];
    if (typeof field === "string") address[key] = field;
  }
  return address;
}

// The details typed before a redirect payment (this tab only), read once.
function takeSavedCheckoutForm() {
  try {
    const raw = window.sessionStorage.getItem(SAVED_CHECKOUT_FORM_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(SAVED_CHECKOUT_FORM_KEY);
    const saved = JSON.parse(raw) as Record<string, unknown> | null;
    return {
      shipping: readSavedAddress(saved?.shipping),
      billing: readSavedAddress(saved?.billing),
      sameAsShipping: saved?.sameAsShipping === true,
    };
  } catch {
    return null;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [shipping, setShipping] = useState<AddressState>(emptyAddress);
  const [billing, setBilling] = useState<AddressState>(emptyAddress);
  // Ticked by default: most customers bill to the delivery address.
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");
  const [selectedCourierCompanyId, setSelectedCourierCompanyId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("prepaid");
  const checkoutTracked = useRef(false);

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]") as CartItem[];
    setCart(storedCart);
  }, []);

  useEffect(() => {
    // Back from Razorpay's redirect flow without a completed payment.
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "failed") {
      setErrorMessage(paymentReturnMessage(params.get("reason")));
      // A reload shouldn't show the message again.
      window.history.replaceState(null, "", window.location.pathname);
    }
    const saved = takeSavedCheckoutForm();
    if (saved) {
      setShipping(saved.shipping);
      setBilling(saved.billing);
      setSameAsShipping(saved.sameAsShipping);
    }

    // Returning to this page from Razorpay's (back/forward cache): let the
    // customer pay again instead of leaving the button stuck.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setIsPaying(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    if (checkoutTracked.current || !cart.length) return;
    checkoutTracked.current = true;
    trackPixelEvent("InitiateCheckout", {
      content_ids: cart.map((item) => item._id),
      content_type: "product",
      contents: cart.map((item) => ({ id: item._id, quantity: item.quantity, item_price: item.price })),
      num_items: cart.reduce((sum, item) => sum + item.quantity, 0),
      value: roundCurrency(cart.reduce((sum, item) => sum + item.price * item.quantity, 0)),
      currency: "INR",
    });
  }, [cart]);

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
  const codFee = shippingQuote?.codFee || 0;
  // GST is included in both courier charges.
  const courierCharges = roundCurrency(shippingFee + codFee);
  const productTaxAmount = extractInclusiveTaxAmount(subtotal, TAX_RATE);
  const productTaxBreakdown = useMemo(
    () => getTaxBreakdown(subtotal, shipping, TAX_RATE),
    [subtotal, shipping]
  );
  const shippingTaxAmount = extractInclusiveTaxAmount(courierCharges, TAX_RATE);
  const shippingTaxBreakdown = useMemo(
    () => getTaxBreakdown(courierCharges, shipping, TAX_RATE),
    [courierCharges, shipping]
  );
  const totalTaxAmount = roundCurrency(productTaxAmount + shippingTaxAmount);
  const combinedCgstAmount = roundCurrency(
    productTaxBreakdown.cgstAmount + shippingTaxBreakdown.cgstAmount
  );
  const combinedSgstAmount = roundCurrency(
    productTaxBreakdown.sgstAmount + shippingTaxBreakdown.sgstAmount
  );
  const combinedIgstAmount = roundCurrency(
    productTaxBreakdown.igstAmount + shippingTaxBreakdown.igstAmount
  );
  const grandTotal = roundCurrency(subtotal + courierCharges);
  const codAllowed = isCodAllowed(subtotal);
  const amountForFreeShipping = amountLeftForFreeShipping(subtotal);
  const freeShippingApplied = Boolean(shippingQuote?.freeShippingApplied);

  useEffect(() => {
    if (paymentMethod === "cod" && !codAllowed) {
      setPaymentMethod("prepaid");
      setSelectedCourierCompanyId(null);
    }
  }, [codAllowed, paymentMethod]);

  const choosePaymentMethod = (method: PaymentMethod) => {
    if (method === paymentMethod) return;
    setPaymentMethod(method);
    // Not every courier accepts COD; let the server pick again.
    setSelectedCourierCompanyId(null);
    setErrorMessage("");
  };

  const rememberPurchase = (orderId: string, value: number, method: PaymentMethod) => {
    const purchase: StoredPurchase = {
      orderId,
      eventId: getPurchaseEventId(orderId),
      value,
      currency: "INR",
      contents: cart.map((item) => ({ id: item._id, quantity: item.quantity, item_price: item.price })),
      numItems: cart.reduce((sum, item) => sum + item.quantity, 0),
      paymentMethod: method,
    };
    try {
      sessionStorage.setItem(LAST_PURCHASE_STORAGE_KEY, JSON.stringify(purchase));
    } catch {
      // Tracking only; the order itself is already saved.
    }
  };

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
            cod: paymentMethod === "cod",
            selectedCourierCompanyId,
          },
          { signal: controller.signal }
        );

        setShippingQuote(res.data);
        setSelectedCourierCompanyId(Number(res.data?.courierCompanyId || 0) || null);
      } catch (error) {
        if (axios.isCancel(error) || (error instanceof Error && error.name === "CanceledError")) return;
        setShippingQuote(null);
        setShippingError(
          (axios.isAxiosError(error) && error.response?.data?.error) ||
            "Unable to fetch live courier rate right now"
        );
      } finally {
        setShippingLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [cart, paymentMethod, selectedCourierCompanyId, shipping.pincode, subtotal]);

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

    const orderPayload = {
      cartItems: cart.map((item) => ({
        productId: item._id,
        quantity: item.quantity,
      })),
      shippingAddress: shipping,
      billingAddress: sameAsShipping ? shipping : billing,
      selectedCourierCompanyId,
      paymentMethod,
      attribution: getStoredAttribution(),
    };

    if (paymentMethod === "cod") {
      try {
        const codRes = await axios.post("/api/create-order", orderPayload);

        if (!codRes.data?.success) {
          throw new Error("Failed to place order");
        }

        rememberPurchase(
          codRes.data.orderId,
          Number(codRes.data.totals?.totalAmount) || grandTotal,
          "cod"
        );
        localStorage.removeItem("cart");
        setCart([]);
        router.push(
          `/checkout/success?order=${encodeURIComponent(
            codRes.data.orderId
          )}&receipt=${encodeURIComponent(codRes.data.receipt)}&method=cod`
        );
      } catch (error) {
        setIsPaying(false);
        setErrorMessage(
          (axios.isAxiosError(error) && error.response?.data?.error) ||
            (error instanceof Error && error.message) ||
            "Failed to place order"
        );
      }
      return;
    }

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay checkout");
      }

      const orderRes = await axios.post("/api/create-order", orderPayload);

      const order = orderRes.data;
      const inAppBrowser = isInAppBrowser();

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
              rememberPurchase(
                verifyRes.data.orderId,
                Number(order.totals?.totalAmount) || grandTotal,
                "prepaid"
              );
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
          } catch (error) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            if (!status || status >= 500) {
              // We couldn't hear back, but the payment may well have gone through
              // (Razorpay's webhook confirms it). Show the order's real status
              // rather than inviting a second payment.
              router.push(
                `/checkout/success?order=${encodeURIComponent(
                  order.internal_order_id
                )}&receipt=${encodeURIComponent(order.receipt)}`
              );
              return;
            }
            setErrorMessage(
              (axios.isAxiosError(error) && error.response?.data?.error) ||
                "Payment verification failed"
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
          courier_name: shippingQuote?.courierName || "",
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
        // In-app browsers: Razorpay's own page, then a form POST to the
        // callback, which confirms the payment (the handler isn't called).
        ...(inAppBrowser
          ? { redirect: true, callback_url: `${window.location.origin}/api/razorpay/callback` }
          : {}),
      });

      razorpay.on("payment.failed", (response: unknown) => {
        setIsPaying(false);
        setErrorMessage(
          (response as { error?: { description?: string } } | null)?.error?.description ||
            "Payment failed. Please try again."
        );
      });

      if (inAppBrowser) {
        // In redirect mode this page is gone when the payment completes, so
        // the success page gets the Purchase details and the order id now.
        rememberPurchase(
          order.internal_order_id,
          Number(order.totals?.totalAmount) || grandTotal,
          "prepaid"
        );
        try {
          sessionStorage.setItem(PENDING_ORDER_KEY, order.internal_order_id);
          sessionStorage.setItem(
            SAVED_CHECKOUT_FORM_KEY,
            JSON.stringify({ shipping, billing, sameAsShipping })
          );
        } catch {
          // Storage blocked: the payment itself still works.
        }
      }

      razorpay.open();
    } catch (error) {
      setIsPaying(false);
      setErrorMessage(
        (axios.isAxiosError(error) && error.response?.data?.error) ||
          (error instanceof Error && error.message) ||
          "Failed to start payment"
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
              autoComplete="name"
              value={shipping.name}
              onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
              className="w-full min-h-11 rounded border p-2"
              required
            />

            <input
              type="email"
              placeholder="Email Address"
              autoComplete="email"
              value={shipping.email}
              onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
              className="w-full min-h-11 rounded border p-2"
              required
            />

            <input
              type="tel"
              placeholder="Phone Number"
              inputMode="numeric"
              autoComplete="tel"
              value={shipping.phone}
              onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
              className="w-full min-h-11 rounded border p-2"
              required
            />

            <textarea
              placeholder="Full Address"
              autoComplete="street-address"
              value={shipping.address}
              onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
              className="w-full rounded border p-2"
              rows={3}
              required
            />

            <input
              type="text"
              placeholder="City"
              autoComplete="address-level2"
              value={shipping.city}
              onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
              className="w-full min-h-11 rounded border p-2"
              required
            />

            <input
              type="text"
              placeholder="State"
              list="india-states"
              autoComplete="address-level1"
              value={shipping.state}
              onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
              className="w-full min-h-11 rounded border p-2"
              required
            />
            <datalist id="india-states">
              {INDIAN_STATES_AND_UTS.map((state) => (
                <option key={state} value={state} />
              ))}
            </datalist>

            <input
              type="text"
              placeholder="Pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              value={shipping.pincode}
              onChange={(e) => setShipping({ ...shipping, pincode: e.target.value })}
              className="w-full min-h-11 rounded border p-2"
              required
            />

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Courier charge to {shipping.city || "your city"}, {shipping.state || "your state"}:{" "}
              <strong>
                {shippingLoading
                  ? "Calculating..."
                  : freeShippingApplied && shippingFee === 0
                    ? "FREE"
                    : `Rs ${shippingFee}`}
              </strong>
              {!shippingLoading &&
              freeShippingApplied &&
              (shippingQuote?.fullShippingFee || 0) > shippingFee ? (
                <span className="ml-2 text-xs text-blue-700 line-through">
                  Rs {shippingQuote?.fullShippingFee}
                </span>
              ) : null}
              <div className="mt-1 text-xs text-blue-700">
                {shippingError
                  ? shippingError
                  : shippingQuote?.shippingLabel || "Enter a valid 6-digit pincode to fetch live courier rates"}
              </div>
              {shippingQuote?.estimated && !shippingError ? (
                <div className="mt-1 text-xs text-blue-700">
                  Live courier rates are unavailable right now, so this is an estimated rate
                  (delivery in {shippingQuote.estimatedDeliveryText || "3–6 days"}).
                </div>
              ) : null}
              {shippingQuote && !shippingError && freeShippingApplied ? (
                <div className="mt-1 text-xs font-semibold text-green-700">
                  Free shipping applied on orders over {formatRupees(FREE_SHIPPING_THRESHOLD)}
                </div>
              ) : null}
              {shippingQuote?.cod && codFee > 0 && !shippingError ? (
                <div className="mt-1 text-xs text-blue-700">
                  Cash on Delivery fee: Rs {codFee} (added to your total)
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

            {FREE_SHIPPING_THRESHOLD > 0 && amountForFreeShipping > 0 && cart.length ? (
              <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-900">
                Add <strong>{formatRupees(amountForFreeShipping)}</strong> more to your order to get
                free shipping (orders over {formatRupees(FREE_SHIPPING_THRESHOLD)}).
              </div>
            ) : null}

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
                            <p className="font-semibold text-gray-900">
                              {courier.rate === 0 ? "Free" : `Rs ${courier.rate}`}
                            </p>
                            {(courier.cod_fee || 0) > 0 ? (
                              <p className="text-xs text-gray-500">incl. COD fee Rs {courier.cod_fee}</p>
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
                  autoComplete="billing name"
                  value={billing.name}
                  onChange={(e) => setBilling({ ...billing, name: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full min-h-11 rounded border p-2 disabled:bg-gray-100"
                  required={!sameAsShipping}
                />

                <input
                  type="email"
                  placeholder="Email Address"
                  autoComplete="billing email"
                  value={billing.email}
                  onChange={(e) => setBilling({ ...billing, email: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full min-h-11 rounded border p-2 disabled:bg-gray-100"
                  required={!sameAsShipping}
                />

                <input
                  type="tel"
                  placeholder="Phone Number"
                  inputMode="numeric"
                  autoComplete="billing tel"
                  value={billing.phone}
                  onChange={(e) => setBilling({ ...billing, phone: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full min-h-11 rounded border p-2 disabled:bg-gray-100"
                  required={!sameAsShipping}
                />

                <textarea
                  placeholder="Full Address"
                  autoComplete="billing street-address"
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
                  autoComplete="billing address-level2"
                  value={billing.city}
                  onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full min-h-11 rounded border p-2 disabled:bg-gray-100"
                  required={!sameAsShipping}
                />

                <input
                  type="text"
                  placeholder="State"
                  list="india-states"
                  autoComplete="billing address-level1"
                  value={billing.state}
                  onChange={(e) => setBilling({ ...billing, state: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full min-h-11 rounded border p-2 disabled:bg-gray-100"
                  required={!sameAsShipping}
                />

                <input
                  type="text"
                  placeholder="Pincode"
                  inputMode="numeric"
                  autoComplete="billing postal-code"
                  value={billing.pincode}
                  onChange={(e) => setBilling({ ...billing, pincode: e.target.value })}
                  disabled={sameAsShipping}
                  className="w-full min-h-11 rounded border p-2 disabled:bg-gray-100"
                  required={!sameAsShipping}
                />
              </div>
            </div>

            <div className="mt-6">
              <h2 className="mb-3 text-xl font-semibold">Payment Method</h2>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => choosePaymentMethod("prepaid")}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    paymentMethod === "prepaid"
                      ? "border-blue-700 bg-blue-50 ring-2 ring-blue-100"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <p className="font-semibold text-gray-900">Pay online</p>
                  <p className="text-sm text-gray-600">UPI, cards, net banking and wallets via Razorpay</p>
                </button>

                {COD_ENABLED ? (
                  <button
                    type="button"
                    onClick={() => codAllowed && choosePaymentMethod("cod")}
                    disabled={!codAllowed}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      paymentMethod === "cod"
                        ? "border-blue-700 bg-blue-50 ring-2 ring-blue-100"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-semibold text-gray-900">Cash on Delivery</p>
                    <p className="text-sm text-gray-600">
                      {codAllowed
                        ? "Pay in cash when your parcel arrives. A Cash on Delivery fee is added to your total."
                        : `Available on orders up to ${formatRupees(COD_MAX_ORDER_VALUE)}`}
                    </p>
                  </button>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPaying || shippingLoading || !shippingQuote || !selectedCourierCompanyId}
              className="mt-6 w-full rounded-lg bg-black py-3 text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {paymentMethod === "cod"
                ? isPaying
                  ? "Placing order..."
                  : `Place Order (Cash on Delivery${grandTotal ? ` – Rs ${grandTotal}` : ""})`
                : isPaying
                  ? "Opening Razorpay..."
                  : "Continue to Payment"}
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
                <span>Courier</span>
                <p className="text-xs text-gray-500">
                  {shippingError
                    ? shippingError
                    : shippingQuote?.shippingLabel || "Live courier rate pending"}
                </p>
              </div>
              <span>
                {shippingLoading
                  ? "..."
                  : freeShippingApplied && shippingFee === 0
                    ? "Free"
                    : `Rs ${shippingFee}`}
              </span>
            </div>
            {codFee > 0 && !shippingLoading ? (
              <div className="flex justify-between">
                <span>Cash on Delivery fee</span>
                <span>Rs {codFee}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <div>
                <span>GST Included ({TAX_RATE}%)</span>
                <p className="text-xs text-gray-500">{taxLabel}</p>
                {productTaxBreakdown.zone === "intra_state" ? (
                  <p className="text-xs text-gray-500">
                    CGST ({productTaxBreakdown.cgstRate}%): Rs {combinedCgstAmount} + SGST ({productTaxBreakdown.sgstRate}%): Rs {combinedSgstAmount}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    IGST ({productTaxBreakdown.igstRate}%): Rs {combinedIgstAmount}
                  </p>
                )}
              </div>
              <span>Rs {totalTaxAmount}</span>
            </div>
          </div>

          <div className="mt-4 flex justify-between border-t pt-4 text-lg font-semibold">
            <span>{paymentMethod === "cod" ? "Total (pay on delivery)" : "Total"}</span>
            <span>Rs {grandTotal}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
