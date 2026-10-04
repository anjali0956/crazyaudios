"use client";

import { useCallback, useEffect, useState } from "react";

/** The customer-facing part of /api/shipping-rate (never the courier's base rates). */
export type CheckoutQuote = {
  shippingFee: number;
  codFee: number;
  etaDate: string | null;
  courierName: string;
  courierCompanyId: number;
  estimated: boolean;
  freeShippingApplied: boolean;
  estimatedDeliveryText: string;
};

export type QuoteErrorKind = "unserviceable" | "cod_unavailable" | "cod_limit" | "network";

export type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; quote: CheckoutQuote }
  | { status: "error"; kind: QuoteErrorKind; message: string };

type Line = { productId: string; quantity: number };

const NETWORK_MESSAGE = "We couldn't load delivery charges. Check your connection and try again.";

function pickQuote(data: Record<string, unknown>): CheckoutQuote {
  return {
    shippingFee: Math.max(0, Number(data.shippingFee) || 0),
    codFee: Math.max(0, Number(data.codFee) || 0),
    etaDate: typeof data.etaDate === "string" ? data.etaDate : null,
    courierName: String(data.courierName || "Courier"),
    courierCompanyId: Number(data.courierCompanyId) || 0,
    estimated: Boolean(data.estimated),
    freeShippingApplied: Boolean(data.freeShippingApplied),
    estimatedDeliveryText: String(data.estimatedDeliveryText || ""),
  };
}

async function requestQuote(pincode: string, lines: Line[], cod: boolean, signal?: AbortSignal): Promise<QuoteState> {
  let res: Response;
  try {
    res = await fetch("/api/shipping-rate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deliveryPostcode: pincode, cartItems: lines, cod }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    return { status: "error", kind: "network", message: NETWORK_MESSAGE };
  }
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (res.ok && data && typeof data.shippingFee === "number") return { status: "ready", quote: pickQuote(data) };

  const message = String(data?.error || "");
  if (res.status === 400) {
    if (cod && /not available for this pincode/i.test(message)) return { status: "error", kind: "cod_unavailable", message };
    if (cod && /up to/i.test(message)) return { status: "error", kind: "cod_limit", message };
    return {
      status: "error",
      kind: "unserviceable",
      message: message || "Delivery is not available to this PIN code yet. Please check it, or message us on WhatsApp.",
    };
  }
  return { status: "error", kind: "network", message: NETWORK_MESSAGE };
}

function parseLines(key: string): Line[] {
  if (!key) return [];
  return key.split(",").map((entry) => {
    const [productId, quantity] = entry.split(":");
    return { productId, quantity: Number(quantity) || 1 };
  });
}

/**
 * Courier quotes for the checkout. For a valid PIN code it asks for the
 * prepaid quote and, when Cash on Delivery is possible for this order, the
 * COD quote in parallel, so the COD fee and availability are known before the
 * customer picks a payment method. Results are keyed by PIN + cart, so the
 * loading state is derived instead of set.
 */
export function useShippingQuotes({
  pincode,
  lines,
  codEligible,
}: {
  pincode: string | null;
  lines: Line[];
  codEligible: boolean;
}) {
  const linesKey = lines.map((line) => `${line.productId}:${line.quantity}`).join(",");
  const baseKey = pincode && linesKey ? `${pincode}|${linesKey}` : "";
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<Record<string, QuoteState>>({});

  const prepaidKey = baseKey ? `${baseKey}|prepaid|${attempt}` : "";
  const codKey = baseKey ? `${baseKey}|cod|${attempt}` : "";

  useEffect(() => {
    if (!baseKey || !pincode) return;
    const controller = new AbortController();
    const parsed = parseLines(linesKey);
    const store = (key: string) => (result: QuoteState) => setResults((prev) => ({ ...prev, [key]: result }));
    // Short debounce: a PIN typed digit by digit or a quantity tapped twice asks once.
    const timer = window.setTimeout(() => {
      requestQuote(pincode, parsed, false, controller.signal).then(store(prepaidKey), () => undefined);
      if (codEligible) requestQuote(pincode, parsed, true, controller.signal).then(store(codKey), () => undefined);
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [baseKey, pincode, linesKey, codEligible, prepaidKey, codKey]);

  const prepaid: QuoteState = !prepaidKey ? { status: "idle" } : (results[prepaidKey] ?? { status: "loading" });
  const cod: QuoteState = !codKey || !codEligible ? { status: "idle" } : (results[codKey] ?? { status: "loading" });

  /** Ask again for both quotes (after a network error). */
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  /** Re-check the COD quote in the background (when the customer picks COD); the current one stays on screen. */
  const refreshCod = useCallback(() => {
    if (!codKey || !pincode || !codEligible) return;
    requestQuote(pincode, parseLines(linesKey), true).then(
      (result) => {
        // A blip on the refresh must not replace a good quote with an error.
        if (result.status === "error" && result.kind === "network") return;
        setResults((prev) => ({ ...prev, [codKey]: result }));
      },
      () => undefined
    );
  }, [codKey, pincode, linesKey, codEligible]);

  return { prepaid, cod, retry, refreshCod };
}
