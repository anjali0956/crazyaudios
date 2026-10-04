"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { IconAlert, IconChevronDown } from "../icons";
import { cx } from "./cx";

type FieldOwnProps = {
  /** Visible label above the control. */
  label: ReactNode;
  /** Helper text under the control (muted). */
  hint?: ReactNode;
  /** Error message; marks the control aria-invalid and links it via aria-describedby. */
  error?: ReactNode;
  /** Adds a muted "(optional)" after the label. */
  optional?: boolean;
  /** Extra classes for the outer wrapper. */
  className?: string;
};

type FieldRenderProps = { id: string; describedBy: string | undefined; invalid: boolean };

/**
 * Label + control + hint/error wrapper. Use it for custom controls; for
 * standard ones use <Input>, <Select> or <Textarea>, which wrap it.
 *
 *   <Field label="PIN code" hint="6 digits" error={err}>
 *     {({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} aria-invalid={invalid} />}
 *   </Field>
 */
export function Field({
  label,
  hint,
  error,
  optional,
  className,
  id: idProp,
  children,
}: FieldOwnProps & { id?: string; children: (props: FieldRenderProps) => ReactNode }) {
  const autoId = useId();
  const id = idProp || `f${autoId.replace(/:/g, "")}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("flex flex-col", className)}>
      <label htmlFor={id} className="mb-1.5 text-[14px] font-semibold leading-5 text-ink-2">
        {label}
        {optional ? <span className="font-normal text-muted"> (optional)</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint ? (
        <p id={hintId} className="mt-1.5 text-[13px] leading-[18px] text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium leading-[18px] text-danger">
          <IconAlert size={16} className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

const CONTROL =
  "w-full rounded-chip border bg-card text-[16px] leading-6 text-ink placeholder:text-muted " +
  "transition-[border-color,box-shadow] duration-150 ease-out " +
  "hover:border-ink-2/60 focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal-ink " +
  "disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted";

function controlBorder(invalid: boolean) {
  return invalid ? "border-danger" : "border-line-strong";
}

export type InputProps = FieldOwnProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
    /** Classes for the <input> itself. */
    inputClassName?: string;
    /** Content inside the field on the left, e.g. "+91" for phone numbers. */
    prefix?: ReactNode;
  };

/**
 * 48px text input with label, hint and error. All native props pass through
 * (name, type, autoComplete, inputMode, required, pattern, ...).
 *
 *   <Input label="Mobile number" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" prefix="+91" />
 */
export function Input({ label, hint, error, optional, className, inputClassName, prefix, id, ...rest }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className} id={id}>
      {({ id: fieldId, describedBy, invalid }) =>
        prefix ? (
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[16px] text-muted">
              {prefix}
            </span>
            <input
              id={fieldId}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              className={cx(CONTROL, controlBorder(invalid), "h-12 pl-12 pr-3.5", inputClassName)}
              {...rest}
            />
          </div>
        ) : (
          <input
            id={fieldId}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cx(CONTROL, controlBorder(invalid), "h-12 px-3.5", inputClassName)}
            {...rest}
          />
        )
      }
    </Field>
  );
}

export type SelectProps = FieldOwnProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
    selectClassName?: string;
    /** Shown as a disabled first option when the value is empty. */
    placeholder?: string;
    children: ReactNode;
  };

/**
 * Native 48px select (best on Android) with a custom chevron.
 *
 *   <Select label="State" name="state" autoComplete="address-level1" placeholder="Choose state">{options}</Select>
 */
export function Select({ label, hint, error, optional, className, selectClassName, placeholder, id, children, ...rest }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className} id={id}>
      {({ id: fieldId, describedBy, invalid }) => (
        <div className="relative">
          <select
            id={fieldId}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cx(CONTROL, controlBorder(invalid), "h-12 appearance-none pl-3.5 pr-10", selectClassName)}
            {...rest}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {children}
          </select>
          <IconChevronDown size={20} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-2" />
        </div>
      )}
    </Field>
  );
}

export type TextareaProps = FieldOwnProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
    textareaClassName?: string;
  };

/** Multi-line text with the same label/hint/error treatment. */
export function Textarea({ label, hint, error, optional, className, textareaClassName, id, rows = 4, ...rest }: TextareaProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className} id={id}>
      {({ id: fieldId, describedBy, invalid }) => (
        <textarea
          id={fieldId}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cx(CONTROL, controlBorder(invalid), "min-h-24 px-3.5 py-3", textareaClassName)}
          {...rest}
        />
      )}
    </Field>
  );
}

/**
 * Checkbox row with a 22px box (ink when checked) and a label that is the
 * tap target.
 *
 *   <Checkbox label="Billing address same as delivery" checked={same} onChange={e => setSame(e.target.checked)} />
 */
export function Checkbox({
  label,
  hint,
  className,
  id,
  ...rest
}: { label: ReactNode; hint?: ReactNode; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  const autoId = useId();
  const fieldId = id || `c${autoId.replace(/:/g, "")}`;
  return (
    <div className={cx("flex items-start gap-3", className)}>
      <span className="relative mt-[11px] inline-flex h-[22px] w-[22px] shrink-0">
        <input
          id={fieldId}
          type="checkbox"
          className="peer h-[22px] w-[22px] cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-card checked:border-ink checked:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink"
          {...rest}
        />
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-white opacity-0 peer-checked:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <label htmlFor={fieldId} className="flex min-h-11 flex-col justify-center py-2 text-[15px] leading-[22px] text-ink">
        <span>{label}</span>
        {hint ? <span className="text-[13px] leading-[18px] text-muted">{hint}</span> : null}
      </label>
    </div>
  );
}
