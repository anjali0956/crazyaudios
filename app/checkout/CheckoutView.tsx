"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useCart, type CartItem } from "@/app/components/cart/CartProvider";
import { WhatsAppLink } from "@/app/components/chrome/TrackedLink";
import { SUPPORT_HOURS, WHATSAPP_DISPLAY } from "@/app/components/chrome/links";
import { deliveryPromise } from "@/app/components/checkout/format";
import { IconLock } from "@/app/components/checkout/icons";
import { OrderTotals } from "@/app/components/checkout/OrderTotals";
import { useCartValidation, type RemovedLine } from "@/app/components/checkout/useCartValidation";
import { useIsCompact } from "@/app/components/checkout/useMediaQuery";
import { IconAlert, IconBag, IconCheck, IconCheckCircle, IconClose, IconInfo, IconWhatsApp } from "@/app/components/icons";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { Checkbox, Input, Select } from "@/app/components/ui/Field";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";
import { useBottomBar, useReservedBottomSpace } from "@/app/components/ui/useBottomBar";
import { cx } from "@/app/components/ui/cx";
import { getStoredAttribution } from "@/lib/attribution";
import { normalizePincode, validateCheckoutAddresses } from "@/lib/checkout-validation";
import { formatINR } from "@/lib/format";
import { INDIAN_STATES_AND_UTS } from "@/lib/india";
import { LAST_PURCHASE_STORAGE_KEY, getPurchaseEventId, trackPixelEvent, type StoredPurchase } from "@/lib/meta-pixel";
import { extractInclusiveTaxAmount, roundCurrency } from "@/lib/order-utils";
import { whatsappLink } from "@/lib/site";
import {
  COD_ENABLED,
  COD_MAX_ORDER_VALUE,
  FREE_SHIPPING_THRESHOLD,
  amountLeftForFreeShipping,
  isCodAllowed,
  type PaymentMethod,
} from "@/lib/shipping-policy";
import {
  EMPTY_FORM,
  buildAddresses,
  cleanPhoneInput,
  cleanPincodeInput,
  fieldId,
  firstErrorKey,
  loadSavedDetails,
  mapServerFieldErrors,
  saveDetails,
  validateField,
  validateForm,
  withSavedDetails,
  type AddressFields,
  type CheckoutFormState,
  type FieldErrors,
  type FieldKey,
  type Section,
} from "./checkout-form";
import { DesktopSummary, MobileSummary } from "./CheckoutSummary";
import { DeliveryEstimate } from "./DeliveryEstimate";
import { PaymentOptions, type CodOption } from "./PaymentOptions";
import {
  PENDING_ORDER_KEY,
  isInAppBrowser,
  loadRazorpayScript,
  type PrepaidOrder,
  type RazorpaySuccess,
} from "./razorpay-client";
import { useShippingQuotes, type QuoteState } from "./useShippingQuotes";

export type PaymentReturn = "failed" | "cancelled" | "verify";

type PinLookup =
  | { status: "loading" }
  | { status: "found"; city: string; state: string | null }
  | { status: "not_found" }
  | { status: "failed" };

type Notice =
  | { kind: "payment"; reason: PaymentReturn }
  | { kind: "error"; title: string; text?: string; whatsapp?: boolean };

type JsonResult = { ok: boolean; status: number; data: Record<string, unknown> | null };

const BAR_HEIGHT = 76;
const LOGIN_HREF = `/login?callbackUrl=${encodeURIComponent("/checkout")}`;
const HELP_MESSAGE = "Hi CrazyAudios, I need help with my order on the checkout page.";

async function postJson(url: string, body: unknown): Promise<JsonResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, data: null };
  }
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: res.ok, status: res.status, data };
}

async function fetchPinLookup(pin: string): Promise<PinLookup> {
  try {
    const res = await fetch(`/api/pincode/${pin}`);
    const data = (await res.json().catch(() => null)) as
      | { found?: boolean; city?: string; state?: string | null; reason?: string }
      | null;
    if (res.ok && data?.found) return { status: "found", city: String(data.city || ""), state: data.state ? String(data.state) : null };
    if (res.ok && data?.reason === "not_found") return { status: "not_found" };
    return { status: "failed" };
  } catch {
    return { status: "failed" };
  }
}

/** Fills city/state from a PIN lookup unless the customer typed their own. */
function applyPinLookup(form: CheckoutFormState, section: Section, pin: string, found: { city: string; state: string | null }) {
  const address = form[section];
  if (cleanPincodeInput(address.pincode) !== pin) return form;
  const auto = form.auto[section];
  let { city, state } = address;
  if (found.city && (!city.trim() || city === auto.city)) city = found.city;
  if (found.state && (!state || state === auto.state)) state = found.state;
  if (city === address.city && state === address.state) return form;
  return {
    ...form,
    [section]: { ...address, city, state },
    auto: {
      ...form.auto,
      [section]: { city: city === found.city ? found.city : auto.city, state: state === found.state ? found.state : auto.state },
    },
  };
}

/** Hand-off to the success page's Purchase event (app/checkout/success/PurchaseTracker). */
function rememberPurchase(items: CartItem[], orderId: string, value: number, method: PaymentMethod) {
  const purchase: StoredPurchase = {
    orderId,
    eventId: getPurchaseEventId(orderId),
    value,
    currency: "INR",
    contents: items.map((item) => ({ id: item._id, quantity: item.quantity, item_price: item.price })),
    numItems: items.reduce((sum, item) => sum + item.quantity, 0),
    paymentMethod: method,
  };
  try {
    sessionStorage.setItem(LAST_PURCHASE_STORAGE_KEY, JSON.stringify(purchase));
  } catch {
    // Tracking only; the order itself is already saved.
  }
}

function successUrl(orderId: string, receipt: string, method?: PaymentMethod) {
  const query = `order=${encodeURIComponent(orderId)}&receipt=${encodeURIComponent(receipt)}`;
  return `/checkout/success?${query}${method === "cod" ? "&method=cod" : ""}`;
}

function focusField(key: FieldKey) {
  const element = document.getElementById(fieldId(key));
  if (!element) return;
  element.scrollIntoView({ block: "center" });
  element.focus({ preventScroll: true });
}

export function CheckoutView({ paymentReturn = null }: { paymentReturn?: PaymentReturn | null }) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const toast = useToast();
  const { items, ready, subtotal, count, clear } = useCart();
  const check = useCartValidation();
  const compact = useIsCompact();

  const [form, setForm] = useState<CheckoutFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [method, setMethod] = useState<PaymentMethod>("prepaid");
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(paymentReturn ? { kind: "payment", reason: paymentReturn } : null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [pinLookups, setPinLookups] = useState<Record<string, PinLookup>>({});

  const pinRequests = useRef(new Map<string, Promise<PinLookup>>());
  const pendingOrder = useRef<{ key: string; order: PrepaidOrder } | null>(null);
  const tracked = useRef(false);
  const noticeRef = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------ derived state
  const deliveryPin = normalizePincode(form.delivery.pincode);
  const codPossible = COD_ENABLED && isCodAllowed(subtotal);
  const lines = useMemo(() => items.map((item) => ({ productId: item._id, quantity: item.quantity })), [items]);
  const quotes = useShippingQuotes({
    pincode: ready && items.length ? deliveryPin : null,
    lines,
    codEligible: codPossible,
  });

  const prepaidQuote = quotes.prepaid.status === "ready" ? quotes.prepaid.quote : null;
  const codQuote = quotes.cod.status === "ready" ? quotes.cod.quote : null;
  const codExtra = codQuote
    ? Math.max(0, roundCurrency(codQuote.shippingFee + codQuote.codFee - (prepaidQuote?.shippingFee ?? codQuote.shippingFee)))
    : null;

  let codOption: CodOption = null;
  if (COD_ENABLED) {
    if (!isCodAllowed(subtotal)) {
      codOption = { enabled: false, reason: `Available on orders up to ${formatINR(COD_MAX_ORDER_VALUE)}` };
    } else if (quotes.cod.status === "error" && quotes.cod.kind !== "network") {
      codOption = {
        enabled: false,
        reason:
          quotes.cod.kind === "cod_limit"
            ? `Available on orders up to ${formatINR(COD_MAX_ORDER_VALUE)}`
            : "Not available for this PIN code",
      };
    } else {
      codOption = { enabled: true, extra: codExtra };
    }
  }

  const payMethod: PaymentMethod = method === "cod" && codOption?.enabled ? "cod" : "prepaid";
  const active: QuoteState = payMethod === "cod" ? quotes.cod : quotes.prepaid;
  const activeQuote = active.status === "ready" ? active.quote : null;
  const shippingFee = activeQuote ? activeQuote.shippingFee : null;
  const codFee = payMethod === "cod" && activeQuote ? activeQuote.codFee : null;
  const courierCharges = roundCurrency((shippingFee ?? 0) + (codFee ?? 0));
  const total = roundCurrency(subtotal + courierCharges);
  const gst = roundCurrency(extractInclusiveTaxAmount(subtotal) + extractInclusiveTaxAmount(courierCharges));
  const waitingForQuote = Boolean(deliveryPin) && active.status === "loading";
  const freeShippingLeft = amountLeftForFreeShipping(subtotal);
  const showForm = ready && items.length > 0 && !placed;

  useBottomBar(compact && showForm, BAR_HEIGHT);
  // The pay bar is always on screen on phones: keep the footer's last links clear of it.
  useReservedBottomSpace(compact && showForm, BAR_HEIGHT);

  // ------------------------------------------------------------ effects
  // Meta InitiateCheckout, once, with the same payload as before (after the cart check, so prices are live).
  useEffect(() => {
    if (tracked.current || !ready || !items.length) return;
    if (check.status === "idle" || check.status === "checking") return;
    tracked.current = true;
    trackPixelEvent("InitiateCheckout", {
      content_ids: items.map((item) => item._id),
      content_type: "product",
      contents: items.map((item) => ({ id: item._id, quantity: item.quantity, item_price: item.price })),
      num_items: items.reduce((sum, item) => sum + item.quantity, 0),
      value: roundCurrency(items.reduce((sum, item) => sum + item.price * item.quantity, 0)),
      currency: "INR",
    });
  }, [ready, items, check.status]);

  const startLookup = useCallback((section: Section, pin: string) => {
    let request = pinRequests.current.get(pin);
    if (!request) {
      request = fetchPinLookup(pin);
      pinRequests.current.set(pin, request);
      setPinLookups((prev) => (prev[pin] ? prev : { ...prev, [pin]: { status: "loading" } }));
    }
    request.then((result) => {
      setPinLookups((prev) => (prev[pin] === result ? prev : { ...prev, [pin]: result }));
      if (result.status === "found") setForm((current) => applyPinLookup(current, section, pin, result));
    });
  }, []);

  // Returning customer on this device: pre-fill contact + delivery address.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = loadSavedDetails();
      if (!saved) return;
      setForm((current) => withSavedDetails(current, saved));
      const pin = normalizePincode(saved.delivery?.pincode);
      if (pin) startLookup("delivery", pin);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [startLookup]);

  // Back from Razorpay's page via the back button (bfcache): unfreeze the form.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setSubmitting(false);
      setPlaced(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // ------------------------------------------------------------ field handlers
  const valueOf = (key: FieldKey, state: CheckoutFormState) => {
    if (key === "phone" || key === "email") return state[key];
    const [section, field] = key.split(".") as [Section, keyof AddressFields];
    return state[section][field];
  };

  const setField = (key: FieldKey, raw: string) => {
    let next: CheckoutFormState;
    if (key === "phone") next = { ...form, phone: cleanPhoneInput(raw) };
    else if (key === "email") next = { ...form, email: raw };
    else {
      const [section, field] = key.split(".") as [Section, keyof AddressFields];
      const value = field === "pincode" ? cleanPincodeInput(raw) : raw;
      next = { ...form, [section]: { ...form[section], [field]: value } };
      if (field === "pincode") {
        const pin = normalizePincode(value);
        if (pin) {
          startLookup(section, pin);
          if (section === "delivery" && payMethod === "prepaid") void loadRazorpayScript();
        }
      }
    }
    setForm(next);
    // A server message is about the old value; editing the field retires it.
    if (serverErrors[key]) {
      setServerErrors((current) => {
        const rest = { ...current };
        delete rest[key];
        return rest;
      });
    }
  };

  // Flag a field on blur (only once something was typed), so tabbing through
  // empty fields stays quiet until the customer tries to pay.
  const blurField = (key: FieldKey) => {
    if (!String(valueOf(key, form)).trim() && !errors[key]) return;
    const message = validateField(key, form);
    setErrors((current) => (current[key] === message ? current : { ...current, [key]: message }));
  };

  /**
   * The message shown under a field: the server's, until the field is edited;
   * otherwise the live client rule for a flagged field, so it updates while
   * typing and disappears as soon as the value is valid, however it got there
   * (typing, PIN autofill, saved details).
   */
  const shownError = (key: FieldKey) => serverErrors[key] ?? (errors[key] ? validateField(key, form) : undefined);

  /** Props shared by every text field: value, change, blur, id, error. */
  const bind = (key: FieldKey) => ({
    id: fieldId(key),
    name: key,
    value: valueOf(key, form),
    onChange: (event: { target: { value: string } }) => setField(key, event.target.value),
    onBlur: () => blurField(key),
    error: shownError(key),
  });

  const selectMethod = (value: PaymentMethod) => {
    if (value === method) return;
    setMethod(value);
    if (value === "cod") quotes.refreshCod();
    else if (deliveryPin) void loadRazorpayScript();
  };

  const showNotice = (next: Notice) => {
    setNotice(next);
    window.setTimeout(() => noticeRef.current?.scrollIntoView({ block: "center" }), 0);
  };

  // ------------------------------------------------------------ submit
  const handleOrderError = (result: JsonResult) => {
    const message = typeof result.data?.error === "string" ? result.data.error : "";
    if (!result.status) {
      toast.error("No internet connection?", { description: "Check your connection and try again." });
      showNotice({ kind: "error", title: "We couldn't reach our server", text: "Check your internet connection and try again. Nothing was charged." });
      return;
    }
    if (result.status === 400 && result.data?.fieldErrors) {
      const mapped = mapServerFieldErrors(result.data.fieldErrors, form.billingSame);
      const first = firstErrorKey(mapped);
      if (first) {
        setServerErrors(mapped);
        focusField(first);
        toast.error("Please check the highlighted details");
        return;
      }
    }
    if (result.status === 409) check.recheck();
    showNotice({
      kind: "error",
      title: result.status === 409 ? "Your cart changed" : "We couldn't place your order",
      text: message || "Please try again in a minute, or message us on WhatsApp.",
      whatsapp: result.status >= 500 || result.status === 429,
    });
  };

  const finishPaid = (orderId: string, receipt: string) => {
    pendingOrder.current = null;
    setPlaced(true);
    clear();
    router.push(successUrl(orderId, receipt));
  };

  const verifyPayment = async (response: RazorpaySuccess, order: PrepaidOrder) => {
    const result = await postJson("/api/verify-payment", { ...response, internal_order_id: order.internal_order_id });
    if (result.ok && result.data?.success) {
      finishPaid(String(result.data.orderId || order.internal_order_id), String(result.data.receipt || order.receipt));
      return;
    }
    if (!result.status || result.status >= 500) {
      // We couldn't hear back, but the payment may well have gone through (the
      // webhook confirms it). Show the order's real status, never a second payment.
      setPlaced(true);
      router.push(successUrl(order.internal_order_id, order.receipt));
      return;
    }
    setSubmitting(false);
    showNotice({
      kind: "error",
      title: "We couldn't confirm your payment",
      text:
        (typeof result.data?.error === "string" && result.data.error) ||
        "If money was deducted, please don't pay again: message us on WhatsApp and we'll check it.",
      whatsapp: true,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || placed) return;

    // 1. Same rules as the server, field by field.
    const fieldErrors = validateForm(form);
    const first = firstErrorKey(fieldErrors);
    if (first) {
      setErrors(fieldErrors);
      focusField(first);
      return;
    }
    const { shippingAddress, billingAddress } = buildAddresses(form);
    // Belt and braces: the server's own validator, run here on the exact payload.
    const parity = validateCheckoutAddresses(shippingAddress, form.billingSame ? undefined : billingAddress);
    if (!parity.ok) {
      const mapped = mapServerFieldErrors(parity.fieldErrors, form.billingSame);
      const firstMapped = firstErrorKey(mapped);
      if (firstMapped) {
        setServerErrors(mapped);
        focusField(firstMapped);
        return;
      }
    }
    setErrors({});
    setServerErrors({});

    // 2. A delivery quote for this PIN code and payment method.
    if (active.status === "error") {
      if (active.kind === "network") {
        quotes.retry();
        toast.warn("Getting delivery charges again", { description: "Tap Pay again in a moment." });
      } else {
        focusField("delivery.pincode");
      }
      return;
    }
    if (!activeQuote) return;
    if (!items.length) return;

    setSubmitting(true);
    setNotice(null);

    const payload = {
      cartItems: items.map((item) => ({ productId: item._id, quantity: item.quantity })),
      shippingAddress,
      billingAddress,
      selectedCourierCompanyId: activeQuote.courierCompanyId > 0 ? activeQuote.courierCompanyId : undefined,
      paymentMethod: payMethod,
      attribution: getStoredAttribution(),
    };

    if (payMethod === "cod") {
      const result = await postJson("/api/create-order", payload);
      if (!result.ok || !result.data?.success) {
        setSubmitting(false);
        handleOrderError(result);
        return;
      }
      const orderId = String(result.data.orderId);
      const totals = result.data.totals as { subtotal?: number } | undefined;
      rememberPurchase(items, orderId, Number(totals?.subtotal) || subtotal, "cod");
      saveDetails(form);
      setPlaced(true);
      clear();
      router.push(successUrl(orderId, String(result.data.receipt), "cod"));
      return;
    }

    // Prepaid: Razorpay Checkout.
    const scriptReady = await loadRazorpayScript();
    if (!scriptReady || !window.Razorpay) {
      setSubmitting(false);
      showNotice({
        kind: "error",
        title: "The payment window didn't open",
        text: codPossible
          ? "Check your internet connection and try again, or choose Cash on Delivery."
          : "Check your internet connection and try again.",
      });
      return;
    }

    // Retrying with the same cart, address and method reuses the Razorpay order.
    const payloadKey = JSON.stringify({ ...payload, attribution: null });
    let order = pendingOrder.current?.key === payloadKey ? pendingOrder.current.order : null;
    if (!order) {
      const result = await postJson("/api/create-order", payload);
      if (!result.ok || typeof result.data?.order_id !== "string") {
        setSubmitting(false);
        handleOrderError(result);
        return;
      }
      order = result.data as unknown as PrepaidOrder;
      pendingOrder.current = { key: payloadKey, order };
    }

    const paying = order;
    // Before opening Razorpay: in redirect mode this page is gone when the payment completes.
    rememberPurchase(items, paying.internal_order_id, Number(paying.totals?.subtotal) || subtotal, "prepaid");
    try {
      sessionStorage.setItem(PENDING_ORDER_KEY, paying.internal_order_id);
    } catch {}
    saveDetails(form);

    const inApp = isInAppBrowser();
    const options: Record<string, unknown> = {
      key: paying.key_id,
      amount: paying.amount,
      currency: paying.currency || "INR",
      name: "CrazyAudios",
      description: `Order ${paying.receipt}`,
      order_id: paying.order_id,
      prefill: { name: shippingAddress.name, email: shippingAddress.email, contact: shippingAddress.phone },
      notes: {
        shipping_address: shippingAddress.address,
        shipping_city: shippingAddress.city,
        shipping_state: shippingAddress.state,
        shipping_pincode: shippingAddress.pincode,
        courier_name: activeQuote.courierName,
      },
      theme: { color: "#121416" },
      handler: (response: RazorpaySuccess) => {
        void verifyPayment(response, paying);
      },
      modal: {
        ondismiss: () => {
          setSubmitting(false);
          toast.info("Payment not completed", {
            description: codPossible ? "Try again, or choose Cash on Delivery." : "Your order isn't placed yet.",
          });
        },
      },
    };
    if (inApp) {
      // Instagram / Facebook in-app browsers: Razorpay's own page, then a form POST back to us.
      options.redirect = true;
      options.callback_url = `${window.location.origin}/api/razorpay/callback`;
    }

    try {
      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (response: unknown) => {
        setSubmitting(false);
        const description = (response as { error?: { description?: string } } | null)?.error?.description;
        showNotice({
          kind: "error",
          title: "Payment didn't go through",
          text: `${description ? `${description} ` : ""}You can try again${codPossible ? ", or choose Cash on Delivery" : ""}.`,
        });
      });
      razorpay.open();
    } catch {
      setSubmitting(false);
      showNotice({ kind: "error", title: "The payment window didn't open", text: "Please try again in a moment." });
    }
  };

  // ------------------------------------------------------------ render
  if (placed) return <PlacedState />;
  if (!ready) return <CheckoutSkeleton />;
  if (!items.length) return <EmptyCheckout removed={check.removed} />;

  const lookup = deliveryPin ? pinLookups[deliveryPin] : undefined;
  const pinUnserviceable =
    quotes.prepaid.status === "error" && quotes.prepaid.kind === "unserviceable" ? quotes.prepaid.message : undefined;
  const pinError = shownError("delivery.pincode") ?? pinUnserviceable;
  const pinHint = pinError ? undefined : (
    <PinHint lookup={lookup} promise={activeQuote ? deliveryPromise(activeQuote) : ""} />
  );

  const totalsProps = {
    itemCount: count,
    itemsTotal: subtotal,
    shipping: shippingFee,
    shippingLabel: activeQuote ? `Shipping · ${activeQuote.courierName}` : "Shipping",
    shippingPending: deliveryPin && active.status === "loading" ? "Calculating…" : "Enter PIN code",
    codFee,
    total,
    gst,
    totalNote: payMethod === "cod" && activeQuote ? "Pay in cash when your parcel arrives" : undefined,
  };
  const freeShippingNote =
    FREE_SHIPPING_THRESHOLD > 0 && freeShippingLeft > 0 ? (
      <p className="mt-3 flex items-start gap-2 rounded-chip bg-paper px-3 py-2 text-[13px] leading-[18px] text-ink-2">
        <IconInfo size={16} className="mt-px shrink-0 text-muted" />
        <span>
          Add <strong className="type-price text-ink">{formatINR(freeShippingLeft)}</strong> more for free shipping
        </span>
      </p>
    ) : null;

  const payLabel = payMethod === "cod" ? "Place COD order" : shippingFee !== null ? `Pay ${formatINR(total)}` : "Pay now";
  const busyLabel = submitting ? (payMethod === "cod" ? "Placing order…" : "Opening payment…") : "Checking delivery…";

  return (
    <>
      <MobileSummary
        items={items}
        count={count}
        totals={totalsProps}
        footnote={freeShippingNote}
        open={summaryOpen}
        onToggle={() => setSummaryOpen((value) => !value)}
      />

      <div className="lg:flex lg:items-end lg:justify-between lg:pb-6">
        <h1 className="type-h1 sr-only text-ink lg:not-sr-only">Checkout</h1>
        <p className="hidden items-center gap-1.5 text-[14px] text-muted lg:flex">
          <IconLock size={16} />
          Secure checkout
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
        <form id="checkout-form" noValidate onSubmit={handleSubmit} className="min-w-0 max-w-[640px]">
          {notice ? (
            <div ref={noticeRef} className="pt-4 lg:pt-0">
              <NoticeBanner notice={notice} codPossible={codPossible} onDismiss={() => setNotice(null)} />
            </div>
          ) : null}

          <FormSection step={1} id="checkout-contact" title="Contact"
            aside={
              sessionStatus === "unauthenticated" ? (
                <p className="text-[13px] leading-5 text-muted">
                  Have an account?{" "}
                  <Link href={LOGIN_HREF} className="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                    Log in
                  </Link>
                </p>
              ) : null
            }
          >
            <Input
              {...bind("phone")}
              label="Mobile number"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              prefix="+91"
              required
              inputClassName="tabular tracking-[0.02em]"
            />
            <Input
              {...bind("email")}
              label={
                <>
                  Email <span className="font-normal text-muted">for your invoice &amp; tracking</span>
                </>
              }
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </FormSection>

          <FormSection step={2} id="checkout-delivery" title="Delivery address">
            <Input
              {...bind("delivery.pincode")}
              error={pinError}
              hint={pinHint}
              label="PIN code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="postal-code"
              required
              inputClassName="font-mono tracking-[0.08em] tabular"
            />
            <Input {...bind("delivery.name")} label="Full name" autoComplete="name" autoCapitalize="words" maxLength={80} required />
            <Input
              {...bind("delivery.line1")}
              label="House / flat and street"
              placeholder="e.g. 12B, Rose Villa, MG Road"
              autoComplete="address-line1"
              maxLength={200}
              required
            />
            <Input
              {...bind("delivery.line2")}
              label="Area / locality"
              placeholder="e.g. Panampilly Nagar"
              autoComplete="address-line2"
              maxLength={150}
              required
            />
            <Input
              {...bind("delivery.landmark")}
              label="Landmark"
              optional
              placeholder="e.g. Near the bus stand"
              autoComplete="address-line3"
              maxLength={100}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input {...bind("delivery.city")} label="City" autoComplete="address-level2" maxLength={60} required />
              <StateSelect bindProps={bind("delivery.state")} autoComplete="address-level1" />
            </div>

            <DeliveryEstimate state={active} pincode={deliveryPin} onRetry={quotes.retry} />

            <Checkbox
              label="Billing address same as delivery"
              checked={form.billingSame}
              onChange={(event) => {
                const same = event.target.checked;
                setForm((current) => ({ ...current, billingSame: same }));
                if (same) {
                  const withoutBilling = (current: FieldErrors) => {
                    const next = { ...current };
                    for (const key of Object.keys(next) as FieldKey[]) if (key.startsWith("billing.")) delete next[key];
                    return next;
                  };
                  setErrors(withoutBilling);
                  setServerErrors(withoutBilling);
                }
              }}
            />

            {!form.billingSame ? (
              <div className="space-y-4 rounded-card border border-line bg-card p-4">
                <h3 className="type-h3 text-ink">Billing address</h3>
                <Input
                  {...bind("billing.pincode")}
                  label="PIN code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="billing postal-code"
                  required
                  inputClassName="font-mono tracking-[0.08em] tabular"
                />
                <Input {...bind("billing.name")} label="Full name or company" autoComplete="billing name" maxLength={80} required />
                <Input {...bind("billing.line1")} label="House / flat and street" autoComplete="billing address-line1" maxLength={200} required />
                <Input {...bind("billing.line2")} label="Area / locality" autoComplete="billing address-line2" maxLength={150} required />
                <div className="grid grid-cols-2 gap-3">
                  <Input {...bind("billing.city")} label="City" autoComplete="billing address-level2" maxLength={60} required />
                  <StateSelect bindProps={bind("billing.state")} autoComplete="billing address-level1" />
                </div>
              </div>
            ) : null}
          </FormSection>

          <FormSection step={3} id="checkout-payment" title="Payment">
            <PaymentOptions method={payMethod} onSelect={selectMethod} cod={codOption} />
          </FormSection>

          {/* Phones: the honest totals right before the pay bar (desktop has them in the right column). */}
          <div className="mt-6 rounded-card border border-line bg-card px-4 py-3.5 lg:hidden">
            <OrderTotals {...totalsProps} />
            {freeShippingNote}
          </div>

          <p className="mt-8 flex items-start gap-2 border-t border-line pt-5 text-[14px] leading-5 text-ink-2">
            <IconWhatsApp size={18} className="mt-px shrink-0 text-whatsapp" />
            <span>
              Questions before you order?{" "}
              <WhatsAppLink
                href={whatsappLink(HELP_MESSAGE)}
                source="checkout"
                className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
              >
                WhatsApp {WHATSAPP_DISPLAY}
              </WhatsAppLink>{" "}
              <span className="text-muted">({SUPPORT_HOURS})</span>
            </span>
          </p>
        </form>

        <aside aria-label="Order summary" className="hidden lg:sticky lg:top-24 lg:block">
          <DesktopSummary
            items={items}
            count={count}
            totals={totalsProps}
            footnote={freeShippingNote}
            action={
              <>
                <Button
                  type="submit"
                  form="checkout-form"
                  size="lg"
                  fullWidth
                  loading={submitting || waitingForQuote}
                  loadingText={busyLabel}
                  icon={payMethod === "prepaid" ? <IconLock size={18} /> : undefined}
                >
                  {payLabel}
                </Button>
                <p className="mt-3 text-center text-[12.5px] leading-[18px] text-muted">
                  {payMethod === "cod" ? "You pay the courier when your parcel arrives." : "UPI, cards and netbanking via Razorpay."}
                </p>
              </>
            }
          />
        </aside>
      </div>

      {compact ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] shadow-raised lg:hidden">
          <div className="page-wrap flex h-[76px] items-center gap-3">
            <div className="min-w-0 shrink-0">
              <p className="type-price text-[20px] leading-6 text-ink">{formatINR(total)}</p>
              <p className="text-[12px] leading-4 text-muted">
                {shippingFee === null ? "+ shipping" : payMethod === "cod" ? "incl. GST · on delivery" : "incl. GST"}
              </p>
            </div>
            <Button
              type="submit"
              form="checkout-form"
              size="lg"
              className="min-w-0 flex-1"
              loading={submitting || waitingForQuote}
              loadingText={busyLabel}
            >
              {payLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------ pieces

function FormSection({
  step,
  id,
  title,
  aside,
  children,
}: {
  step: number;
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="pt-6 first:pt-5 lg:first:pt-0">
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
        <h2 id={id} className="type-h3 flex items-center gap-2.5 text-ink">
          <span
            aria-hidden="true"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink font-mono text-[12px] font-semibold text-white"
          >
            {step}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function StateSelect({
  bindProps,
  autoComplete,
}: {
  bindProps: {
    id: string;
    name: string;
    value: string;
    onChange: (event: { target: { value: string } }) => void;
    onBlur: () => void;
    error?: string;
  };
  autoComplete: string;
}) {
  return (
    <Select
      {...bindProps}
      label="State"
      placeholder="Choose state"
      autoComplete={autoComplete}
      required
    >
      {INDIAN_STATES_AND_UTS.map((state) => (
        <option key={state} value={state}>
          {state}
        </option>
      ))}
    </Select>
  );
}

function PinHint({ lookup, promise }: { lookup?: PinLookup; promise: string }) {
  if (lookup?.status === "found") {
    const place = [lookup.city, lookup.state].filter(Boolean).join(", ");
    return (
      <span aria-live="polite" className="flex items-start gap-1.5 font-medium text-ok">
        <IconCheck size={16} strokeWidth={2.5} className="mt-px shrink-0" />
        <span>
          {place}
          {promise ? ` · ${promise.replace(/^Delivered by/, "delivered by").replace(/^Delivery in/, "delivery in")}` : ""}
        </span>
      </span>
    );
  }
  if (lookup?.status === "not_found") {
    return (
      <span aria-live="polite" className="text-warn">
        We couldn&apos;t find this PIN code. Please check it.
      </span>
    );
  }
  if (promise) {
    return (
      <span aria-live="polite" className="flex items-start gap-1.5 font-medium text-ok">
        <IconCheck size={16} strokeWidth={2.5} className="mt-px shrink-0" />
        <span>{promise}</span>
      </span>
    );
  }
  return <span aria-live="polite" />;
}

const PAYMENT_RETURN_COPY: Record<PaymentReturn, { title: string; text: string; tone: "warn" | "danger" }> = {
  failed: {
    title: "Your payment didn't go through",
    text: "Your order isn't placed yet and your cart is saved. If money was deducted, message us on WhatsApp and we'll sort it out.",
    tone: "warn",
  },
  cancelled: {
    title: "Payment cancelled",
    text: "Your order isn't placed yet and your cart is saved. Try again when you're ready.",
    tone: "warn",
  },
  verify: {
    title: "We couldn't confirm your payment",
    text: "If money was deducted, please don't pay again. Message us on WhatsApp and we'll check it for you.",
    tone: "danger",
  },
};

function NoticeBanner({ notice, codPossible, onDismiss }: { notice: Notice; codPossible: boolean; onDismiss: () => void }) {
  const copy =
    notice.kind === "payment"
      ? PAYMENT_RETURN_COPY[notice.reason]
      : { title: notice.title, text: notice.text || "", tone: "danger" as const };
  const whatsapp = notice.kind === "payment" ? notice.reason !== "cancelled" : Boolean(notice.whatsapp);
  const suggestCod = notice.kind === "payment" && notice.reason !== "verify" && codPossible;

  return (
    <div
      role="alert"
      className={cx(
        "flex items-start gap-3 rounded-card border px-4 py-3",
        copy.tone === "danger" ? "border-danger/25 bg-danger-soft" : "border-warn/30 bg-warn-soft"
      )}
    >
      <IconAlert size={20} className={cx("mt-0.5 shrink-0", copy.tone === "danger" ? "text-danger" : "text-warn")} />
      <div className="min-w-0 flex-1 text-[14px] leading-5 text-ink">
        <p className="font-semibold">{copy.title}</p>
        {copy.text ? <p className="mt-0.5 text-ink-2">{copy.text}</p> : null}
        {suggestCod ? <p className="mt-0.5 text-ink-2">Cash on Delivery is available for this order.</p> : null}
        {whatsapp ? (
          <WhatsAppLink
            href={whatsappLink(HELP_MESSAGE)}
            source="checkout"
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
          >
            <IconWhatsApp size={16} className="text-whatsapp" />
            WhatsApp {WHATSAPP_DISPLAY}
          </WhatsAppLink>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="-mr-2 -mt-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-card text-ink-2 hover:bg-ink/5"
      >
        <IconClose size={18} />
      </button>
    </div>
  );
}

function PlacedState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center" role="status">
      <IconCheckCircle size={44} className="text-ok" />
      <p className="type-h2 mt-4 text-ink">Order placed</p>
      <p className="mt-2 text-[15px] leading-[22px] text-ink-2">Opening your order confirmation…</p>
    </div>
  );
}

function EmptyCheckout({ removed }: { removed: RemovedLine[] }) {
  return (
    <>
      <h1 className="type-h1 pt-4 text-ink">Checkout</h1>
      {removed.length ? (
        <div role="status" className="mt-4 rounded-card border border-warn/30 bg-warn-soft px-4 py-3 text-[14px] leading-5 text-ink">
          <p className="font-semibold">Some items are no longer available</p>
          <ul className="mt-1 text-ink-2">
            {removed.map((line) => (
              <li key={line.id}>
                {line.name}: {line.reason === "out_of_stock" ? "out of stock" : "no longer available"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <EmptyState
        icon={<IconBag size={26} />}
        title="Your cart is empty"
        description="Add parts to your cart, then come back here to place your order."
        action={
          <ButtonLink href="/category/amplifier-ics" size="lg">
            Shop amplifier ICs
          </ButtonLink>
        }
      />
    </>
  );
}

function SkeletonField({ className }: { className?: string }) {
  return (
    <div className={cx("flex flex-col", className)}>
      <Skeleton className="mb-1.5 mt-[3px] h-3.5 w-28" />
      <div className="h-12 rounded-chip border border-line-strong/60 bg-card" />
    </div>
  );
}

/**
 * Same sections, spacing and field heights as the real form, so nothing on
 * screen moves when the cart has loaded and the form replaces it (CLS).
 */
function CheckoutSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading checkout">
      <div className="-mx-4 flex min-h-12 items-center justify-between border-b border-line bg-card px-4 sm:-mx-6 sm:px-6 lg:hidden">
        <span className="text-[14px] font-medium leading-5 text-ink">Order summary</span>
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="lg:flex lg:items-end lg:justify-between lg:pb-6">
        <h1 className="type-h1 sr-only text-ink lg:not-sr-only">Checkout</h1>
        <p className="hidden items-center gap-1.5 text-[14px] text-muted lg:flex">
          <IconLock size={16} />
          Secure checkout
        </p>
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
        <div className="min-w-0 max-w-[640px]">
          <FormSection step={1} id="checkout-contact-loading" title="Contact">
            <SkeletonField />
            <SkeletonField />
          </FormSection>
          <FormSection step={2} id="checkout-delivery-loading" title="Delivery address">
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <div className="grid grid-cols-2 gap-3">
              <SkeletonField />
              <SkeletonField />
            </div>
            <div className="h-[70px] rounded-card border border-line bg-card" />
            <div className="h-11" />
          </FormSection>
          <FormSection step={3} id="checkout-payment-loading" title="Payment">
            <div className="h-[82px] rounded-card border border-line-strong/60 bg-card" />
            <div className="h-[62px] rounded-card border border-line-strong/60 bg-card" />
          </FormSection>
        </div>
        <div className="hidden h-[460px] rounded-card border border-line bg-card lg:block" />
      </div>
    </div>
  );
}

