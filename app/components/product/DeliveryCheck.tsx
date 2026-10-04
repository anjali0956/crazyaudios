"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { IconAlert, IconCash, IconPackage, IconTruck } from "@/app/components/icons";
import { cx } from "@/app/components/ui/cx";
import { formatINR } from "@/lib/format";
import { COD_ENABLED, COD_MAX_ORDER_VALUE, FREE_SHIPPING_THRESHOLD, isCodAllowed } from "@/lib/shipping-policy";

/** localStorage key holding the last PIN code a visitor checked (checkout can prefill from it). */
export const PINCODE_STORAGE_KEY = "ca_pincode";

const PIN = /^[1-9]\d{5}$/;
const GENERIC_ERROR = "We couldn’t check delivery right now. Please try again in a moment.";

type Quote = { shippingFee: number; etaDate: string | null; estimated: boolean };
type Cod =
  | { kind: "available"; fee: number }
  | { kind: "unavailable" }
  | { kind: "limit" }
  | { kind: "unknown" }
  | { kind: "off" };
type CheckState =
  | { status: "idle" }
  | { status: "loading"; pincode: string }
  | { status: "error"; message: string }
  | { status: "done"; pincode: string; quantity: number; quote: Quote; cod: Cod };

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStoredPin() {
  try {
    const value = window.localStorage.getItem(PINCODE_STORAGE_KEY) || "";
    return PIN.test(value) ? value : "";
  } catch {
    return "";
  }
}

/** "2026-10-08" -> "Thu, 8 Oct" (built from parts so every engine prints the same). */
function formatEta(iso: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const parts = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("weekday")}, ${part("day")} ${part("month")}`;
}

function Line({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/**
 * PIN-code delivery check through /api/shipping-rate (the same quote the
 * checkout uses): delivery date, shipping charge (or FREE) and whether Cash on
 * Delivery is available. Customer prices only; the courier's own numbers are
 * never shown. The last PIN code is remembered and re-checked when this card
 * scrolls near the screen.
 */
export function DeliveryCheck({
  productId,
  quantity,
  unitPrice,
  className,
}: {
  productId: string;
  /** Units the visitor has selected (the quote follows it). */
  quantity: number;
  /** Customer price per unit (decides whether COD can apply to this quantity). */
  unitPrice: number;
  className?: string;
}) {
  const stored = useSyncExternalStore(subscribeStorage, readStoredPin, () => "");
  const [draft, setDraft] = useState<string | null>(null);
  const [state, setState] = useState<CheckState>({ status: "idle" });
  const cardRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const checkedPin = useRef<string | null>(null);
  const autoChecked = useRef(false);
  const quantityRef = useRef(quantity);
  const ids = useId();
  const inputId = `${ids}-pin`;
  const resultId = `${ids}-result`;
  const value = draft ?? stored;

  const run = useCallback(
    async (pincode: string, units: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ status: "loading", pincode });

      const askCod = COD_ENABLED && isCodAllowed(unitPrice * units);
      const post = (cod: boolean) =>
        fetch("/api/shipping-rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryPostcode: pincode, cartItems: [{ productId, quantity: units }], cod }),
          signal: controller.signal,
        });

      try {
        const [prepaid, codResponse] = await Promise.all([
          post(false),
          askCod ? post(true).catch(() => null) : Promise.resolve(null),
        ]);
        const data = await prepaid.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (!prepaid.ok || !data) {
          checkedPin.current = null;
          setState({
            status: "error",
            message: prepaid.status === 400 && data?.error ? String(data.error) : GENERIC_ERROR,
          });
          return;
        }

        let cod: Cod = { kind: "unknown" };
        if (!COD_ENABLED) cod = { kind: "off" };
        else if (!askCod) cod = { kind: "limit" };
        else if (codResponse?.ok) {
          const codData = await codResponse.json().catch(() => null);
          const fee = Number(codData?.codFee);
          if (Number.isFinite(fee)) cod = { kind: "available", fee };
        } else if (codResponse?.status === 400) cod = { kind: "unavailable" };
        if (controller.signal.aborted) return;

        checkedPin.current = pincode;
        try {
          window.localStorage.setItem(PINCODE_STORAGE_KEY, pincode);
        } catch {
          // Storage blocked: the check still works for this visit.
        }
        setState({
          status: "done",
          pincode,
          quantity: units,
          quote: {
            shippingFee: Math.max(0, Number(data.shippingFee) || 0),
            etaDate: typeof data.etaDate === "string" ? data.etaDate : null,
            estimated: Boolean(data.estimated),
          },
          cod,
        });
      } catch {
        if (controller.signal.aborted) return;
        checkedPin.current = null;
        setState({ status: "error", message: GENERIC_ERROR });
      }
    },
    [productId, unitPrice]
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    quantityRef.current = quantity;
  }, [quantity]);

  // A returning visitor's PIN code is checked once this card reaches the screen
  // (no courier calls for visitors who never scroll this far).
  useEffect(() => {
    const card = cardRef.current;
    if (!stored || !card || autoChecked.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || autoChecked.current) return;
        autoChecked.current = true;
        observer.disconnect();
        void run(stored, quantityRef.current);
      },
      { rootMargin: "0px 0px 80px 0px" }
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [stored, run]);

  // The quote follows the selected quantity (weight, free shipping, COD limit).
  useEffect(() => {
    const pincode = checkedPin.current;
    if (!pincode) return;
    const timer = window.setTimeout(() => void run(pincode, quantity), 450);
    return () => window.clearTimeout(timer);
  }, [quantity, run]);

  const submit = (pincode: string) => {
    autoChecked.current = true;
    if (!PIN.test(pincode)) {
      checkedPin.current = null;
      setState({ status: "error", message: "Enter a valid 6-digit PIN code." });
      inputRef.current?.focus();
      return;
    }
    void run(pincode, quantity);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(value.trim());
  };

  const loading = state.status === "loading";
  const invalid = state.status === "error";

  return (
    <section ref={cardRef} aria-labelledby={`${ids}-title`} className={cx("rounded-card border border-line bg-card p-4", className)}>
      <h2 id={`${ids}-title`} className="flex items-center gap-2 text-[16px] font-bold leading-6 tracking-normal text-ink [font-stretch:100%]">
        <IconTruck size={20} className="text-ink-2" />
        Check delivery
      </h2>
      <form onSubmit={onSubmit} noValidate className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          id={inputId}
          name="pincode"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="PIN code"
          aria-label="Delivery PIN code"
          aria-describedby={resultId}
          aria-invalid={invalid || undefined}
          value={value}
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, "").slice(0, 6);
            setDraft(next);
            // Six valid digits: check straight away and let the keyboard close.
            if (PIN.test(next) && next !== checkedPin.current) {
              event.target.blur();
              submit(next);
            }
          }}
          className={cx(
            "h-12 min-w-0 flex-1 rounded-chip border bg-card px-3.5 font-mono text-[16px] tracking-[0.14em] text-ink outline-none transition-colors duration-150",
            "placeholder:font-sans placeholder:tracking-normal placeholder:text-muted focus:border-ink",
            invalid ? "border-danger" : "border-line-strong"
          )}
        />
        <button
          type="submit"
          aria-busy={loading || undefined}
          disabled={loading}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-card bg-ink px-5 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-ink-2 active:bg-night disabled:bg-ink-2"
        >
          {loading ? "Checking…" : "Check"}
        </button>
      </form>

      {/* Same three rows before and after a check, so results never push the page around. */}
      <div id={resultId} aria-live="polite" className="mt-3 min-h-[78px] text-[14px] leading-[22px] text-ink-2">
        {state.status === "idle" || state.status === "loading" ? (
          <ul className="space-y-1.5 text-muted">
            <Line icon={<IconTruck size={18} />}>
              {state.status === "loading" ? <>Checking delivery to {state.pincode}…</> : <>Delivery date for your PIN code</>}
            </Line>
            <Line icon={<IconPackage size={18} />}>
              Shipping charge
              {FREE_SHIPPING_THRESHOLD > 0 ? (
                unitPrice * quantity >= FREE_SHIPPING_THRESHOLD ? (
                  <> · free on this order</>
                ) : (
                  <> · free over {formatINR(FREE_SHIPPING_THRESHOLD)}</>
                )
              ) : null}
            </Line>
            {COD_ENABLED ? <Line icon={<IconCash size={18} />}>Cash on Delivery availability</Line> : null}
          </ul>
        ) : null}
        {state.status === "error" ? (
          <p className="flex gap-2 text-danger">
            <IconAlert size={18} className="mt-0.5 shrink-0" />
            <span>{state.message}</span>
          </p>
        ) : null}
        {state.status === "done" ? <Result state={state} /> : null}
      </div>
    </section>
  );
}

function Result({ state }: { state: Extract<CheckState, { status: "done" }> }) {
  const { quote, cod } = state;
  const eta = formatEta(quote.etaDate);
  return (
    <ul className="space-y-1.5">
      <Line icon={<IconTruck size={18} />}>
        {eta ? (
          <>
            Delivery by <strong className="font-semibold text-ink">{eta}</strong> to {state.pincode}
          </>
        ) : quote.estimated ? (
          <>
            Estimated <strong className="font-semibold text-ink">3–6 days</strong> to {state.pincode}
          </>
        ) : (
          <>Delivers to {state.pincode}</>
        )}
      </Line>
      <Line icon={<IconPackage size={18} />}>
        {quote.shippingFee > 0 ? (
          <>
            Shipping <strong className="font-semibold text-ink tabular">{formatINR(quote.shippingFee)}</strong>
            {FREE_SHIPPING_THRESHOLD > 0 ? (
              <span className="text-muted"> · free over {formatINR(FREE_SHIPPING_THRESHOLD)}</span>
            ) : null}
          </>
        ) : (
          <>
            Shipping <strong className="font-semibold text-ok">FREE</strong>
          </>
        )}
      </Line>
      {cod.kind === "off" ? null : (
        <Line icon={<IconCash size={18} />}>
          {quote.estimated && cod.kind !== "limit" ? (
            <>Cash on Delivery shown at checkout</>
          ) : cod.kind === "available" ? (
            <>
              <span className="font-medium text-ok">Cash on Delivery available</span>
              {cod.fee > 0 ? <span className="text-muted"> · {formatINR(cod.fee)} fee</span> : null}
            </>
          ) : cod.kind === "unavailable" ? (
            <>Cash on Delivery not available here · pay online</>
          ) : cod.kind === "limit" ? (
            <>Prepaid only · Cash on Delivery up to {formatINR(COD_MAX_ORDER_VALUE)}</>
          ) : (
            <>Cash on Delivery shown at checkout</>
          )}
        </Line>
      )}
    </ul>
  );
}
