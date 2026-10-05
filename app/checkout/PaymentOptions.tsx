"use client";

import type { ReactNode } from "react";
import { IconLock } from "@/app/components/checkout/icons";
import { cx } from "@/app/components/ui/cx";
import { formatINR } from "@/lib/format";
import type { PaymentMethod } from "@/lib/shipping-policy";

/** null = Cash on Delivery is switched off store-wide (the option is not shown). */
export type CodOption =
  | { enabled: true; /** What choosing COD adds to the total, once quoted. */ extra: number | null }
  | { enabled: false; reason: string }
  | null;

function Option({
  value,
  checked,
  disabled = false,
  onSelect,
  title,
  description,
  aside,
}: {
  value: PaymentMethod;
  checked: boolean;
  disabled?: boolean;
  onSelect: (value: PaymentMethod) => void;
  title: ReactNode;
  description: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <label
      className={cx(
        "flex items-start gap-3 rounded-card border p-3.5 transition-[border-color,box-shadow] duration-150 ease-out",
        disabled
          ? "cursor-not-allowed border-line bg-paper"
          : checked
            ? "cursor-pointer border-ink bg-card shadow-[inset_0_0_0_1px_var(--color-ink)]"
            : "cursor-pointer border-line-strong bg-card hover:border-ink-2/60"
      )}
    >
      <input
        type="radio"
        name="payment-method"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className={cx(
          "mt-px h-5 w-5 shrink-0 appearance-none rounded-full border-2 bg-card transition-[border-width,border-color] duration-150 ease-out",
          "checked:border-[6px] checked:border-ink disabled:border-line-strong disabled:bg-line",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink",
          disabled ? "cursor-not-allowed" : "cursor-pointer border-line-strong"
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className={cx("text-[15px] font-semibold leading-5", disabled ? "text-muted" : "text-ink")}>{title}</span>
          {aside}
        </span>
        <span className={cx("mt-1 block text-[13px] leading-[18px]", disabled ? "text-warn" : "text-muted")}>{description}</span>
      </span>
    </label>
  );
}

export function PaymentOptions({
  method,
  onSelect,
  cod,
}: {
  method: PaymentMethod;
  onSelect: (value: PaymentMethod) => void;
  cod: CodOption;
}) {
  const codExtra = cod?.enabled ? cod.extra : null;

  return (
    <fieldset className="space-y-2.5">
      <legend className="sr-only">Payment method</legend>
      <Option
        value="prepaid"
        checked={method === "prepaid"}
        onSelect={onSelect}
        title="UPI, cards, netbanking"
        description="GPay, PhonePe, Paytm or any UPI app, debit and credit cards, netbanking"
      />
      {cod ? (
        <Option
          value="cod"
          checked={method === "cod"}
          disabled={!cod.enabled}
          onSelect={onSelect}
          title="Cash on Delivery"
          description={cod.enabled ? "Pay in cash when your parcel arrives" : cod.reason}
          aside={
            cod.enabled && codExtra !== null && codExtra > 0 ? (
              <span className="shrink-0 text-[15px] font-semibold leading-5 text-ink tabular">+{formatINR(codExtra)}</span>
            ) : null
          }
        />
      ) : null}

      {method === "cod" && codExtra !== null && codExtra > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-card bg-ok-soft py-1 pl-3.5 pr-1.5 text-[13px] leading-[18px] text-ok">
          <span>Pay online and skip the {formatINR(codExtra)} COD fee.</span>
          <button
            type="button"
            onClick={() => onSelect("prepaid")}
            className="min-h-11 shrink-0 rounded-chip px-2.5 font-semibold underline decoration-ok/40 underline-offset-2 hover:decoration-ok"
          >
            Pay online
          </button>
        </div>
      ) : null}

      <p className="flex items-start gap-2 pt-1 text-[13px] leading-[18px] text-muted">
        <IconLock size={16} className="mt-px shrink-0" />
        <span>Online payments are processed securely by Razorpay. We never see your card details or UPI PIN.</span>
      </p>
    </fieldset>
  );
}
