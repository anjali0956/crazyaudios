"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IconClose } from "../icons";
import { cx } from "./cx";

export type ToastTone = "success" | "info" | "warn" | "error";

export type ToastAction = {
  label: string;
  /** Internal route to open (the toast closes on click). */
  href?: string;
  onClick?: () => void;
};

export type ToastOptions = {
  /** Reusing an id replaces that toast instead of stacking a new one (e.g. "cart"). */
  id?: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: ToastAction;
  /** Milliseconds before auto-dismiss (default 4000). Paused while hovered or focused. */
  duration?: number;
};

type ToastItem = {
  id: string;
  version: number;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: ToastAction;
  duration: number;
  state: "entering" | "open" | "leaving";
};

export type ToastApi = {
  show: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  success: (title: string, options?: Omit<ToastOptions, "title" | "tone">) => string;
  info: (title: string, options?: Omit<ToastOptions, "title" | "tone">) => string;
  warn: (title: string, options?: Omit<ToastOptions, "title" | "tone">) => string;
  error: (title: string, options?: Omit<ToastOptions, "title" | "tone">) => string;
};

const MAX_VISIBLE = 3;
const LEAVE_MS = 200;

const noop = () => "";
const FALLBACK: ToastApi = { show: noop, dismiss: () => {}, success: noop, info: noop, warn: noop, error: noop };

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Toasts replace window.alert across the storefront.
 *
 *   const toast = useToast();
 *   toast.success("Added to cart", { description: "TIP35 × 1", action: { label: "View cart", href: "/cart" } });
 */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? FALLBACK;
}

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const remove = useCallback((id: string) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      setToasts((list) => list.map((toast) => (toast.id === id ? { ...toast, state: "leaving" } : toast)));
      const existing = timers.current.get(id);
      if (existing) window.clearTimeout(existing);
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id);
          remove(id);
        }, LEAVE_MS)
      );
    },
    [remove]
  );

  const show = useCallback((options: ToastOptions) => {
    counter += 1;
    const id = options.id ?? `t${counter}`;
    const pendingRemoval = timers.current.get(id);
    if (pendingRemoval) {
      window.clearTimeout(pendingRemoval);
      timers.current.delete(id);
    }
    setToasts((list) => {
      const existing = list.find((toast) => toast.id === id);
      const item: ToastItem = {
        id,
        version: counter,
        title: options.title,
        description: options.description,
        tone: options.tone ?? "success",
        action: options.action,
        duration: options.duration ?? 4000,
        state: existing && existing.state !== "leaving" ? "open" : "entering",
      };
      const rest = list.filter((toast) => toast.id !== id);
      return [...rest, item].slice(-MAX_VISIBLE);
    });
    return id;
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      success: (title, options) => show({ ...options, title, tone: "success" }),
      info: (title, options) => show({ ...options, title, tone: "info" }),
      warn: (title, options) => show({ ...options, title, tone: "warn" }),
      error: (title, options) => show({ ...options, title, tone: "error" }),
    }),
    [show, dismiss]
  );

  const markOpen = useCallback((id: string) => {
    setToasts((list) => list.map((toast) => (toast.id === id && toast.state === "entering" ? { ...toast, state: "open" } : toast)));
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* One persistent polite live region, so every toast added later is announced. */}
      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4"
        style={{ bottom: "calc(var(--bottom-bar-h, 0px) + 16px + env(safe-area-inset-bottom, 0px))" }}
      >
        {toasts.map((toast) => (
          <ToastView key={toast.id} toast={toast} onDismiss={dismiss} onEntered={markOpen} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToneIcon({ tone }: { tone: ToastTone }) {
  const ring = {
    success: "bg-signal text-ink",
    info: "bg-white/15 text-white",
    warn: "bg-warn-soft text-warn",
    error: "bg-danger-soft text-danger",
  }[tone];
  return (
    <span aria-hidden="true" className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full", ring)}>
      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        {tone === "success" ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : tone === "info" ? <path d="M12 11v6M12 7h.01" /> : <path d="M12 6.5v7M12 17.5h.01" />}
      </svg>
    </span>
  );
}

function ToastView({
  toast,
  onDismiss,
  onEntered,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  onEntered: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);

  // Enter transition: flip to "open" on the next frame.
  useEffect(() => {
    if (toast.state !== "entering") return;
    const frame = window.requestAnimationFrame(() => onEntered(toast.id));
    return () => window.cancelAnimationFrame(frame);
  }, [toast.state, toast.id, onEntered]);

  // Auto-dismiss, restarted when the toast is replaced (version) and paused on hover/focus.
  useEffect(() => {
    if (paused || toast.state === "leaving" || toast.duration <= 0) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [paused, toast.state, toast.duration, toast.id, toast.version, onDismiss]);

  const action = toast.action;

  return (
    <div
      data-state={toast.state}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="ca-toast on-dark pointer-events-auto flex w-full max-w-[440px] items-center gap-3 rounded-card bg-ink py-1.5 pl-3.5 pr-1 text-white shadow-raised"
    >
      <ToneIcon tone={toast.tone} />
      <div className="min-w-0 flex-1 py-1.5">
        <p className="text-[15px] font-semibold leading-5">{toast.title}</p>
        {toast.description ? <p className="truncate text-[13px] leading-[18px] text-white/75">{toast.description}</p> : null}
      </div>
      {action ? (
        action.href ? (
          <Link
            href={action.href}
            onClick={() => {
              action.onClick?.();
              onDismiss(toast.id);
            }}
            className="inline-flex min-h-11 shrink-0 items-center rounded-chip px-2.5 text-[14px] font-bold text-signal hover:underline hover:underline-offset-4"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              action.onClick?.();
              onDismiss(toast.id);
            }}
            className="inline-flex min-h-11 shrink-0 items-center rounded-chip px-2.5 text-[14px] font-bold text-signal hover:underline hover:underline-offset-4"
          >
            {action.label}
          </button>
        )
      ) : null}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-card text-white/70 hover:bg-white/10 hover:text-white"
      >
        <IconClose size={18} />
      </button>
    </div>
  );
}
