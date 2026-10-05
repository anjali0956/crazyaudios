"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Field } from "@/app/components/ui/Field";
import { cx } from "@/app/components/ui/cx";

/**
 * Password field (foundation Field styling) with a Show/Hide toggle, so
 * people typing on a phone can check what they entered.
 */
export function PasswordInput({
  label,
  hint,
  error,
  id,
  className,
  ...rest
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  id: string;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className" | "id">) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      {({ id: fieldId, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={fieldId}
            type={visible ? "text" : "password"}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={cx(
              "h-12 w-full rounded-chip border bg-card pl-3.5 pr-[76px] text-[16px] leading-6 text-ink placeholder:text-muted",
              "transition-[border-color,box-shadow] duration-150 ease-out hover:border-ink-2/60 focus:border-ink",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal-ink",
              "disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted",
              invalid ? "border-danger" : "border-line-strong"
            )}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-pressed={visible}
            aria-controls={fieldId}
            className="absolute inset-y-0 right-0.5 my-auto inline-flex h-11 min-w-[64px] items-center justify-center rounded-chip px-3 text-[14px] font-semibold text-ink-2 hover:bg-ink/5 hover:text-ink"
          >
            {visible ? "Hide" : "Show"}
            <span className="sr-only"> password</span>
          </button>
        </div>
      )}
    </Field>
  );
}
