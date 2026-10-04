"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "../icons";
import { cx } from "./cx";

export type SheetMobileSide = "bottom" | "top" | "left" | "right";
export type SheetDesktopSide = "left" | "right" | "top" | "center";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  /** Dialog title (required for screen readers; hide visually with hideTitle). */
  title: ReactNode;
  hideTitle?: boolean;
  /** Optional line under the title. */
  description?: ReactNode;
  /** Placement below 1024px (default "bottom"). */
  mobile?: SheetMobileSide;
  /** Placement from 1024px (default "right" drawer). */
  desktop?: SheetDesktopSide;
  /** Drawer width / dialog width on desktop. */
  size?: "sm" | "md" | "lg";
  /** Element to focus when the sheet opens (default: first focusable). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Element to focus after closing (default: whatever had focus before opening). */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Sticky area under the scrolling body (actions). */
  footer?: ReactNode;
  /** Replace the standard title row (you must still render a close control). */
  header?: ReactNode;
  /** Classes for the panel. */
  className?: string;
  /** Classes for the scrolling body. */
  bodyClassName?: string;
  children: ReactNode;
};

const MOBILE: Record<SheetMobileSide, string> = {
  bottom: "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-sheet pb-[env(safe-area-inset-bottom)]",
  top: "inset-x-0 top-0 max-h-[100dvh] rounded-b-sheet",
  left: "inset-y-0 left-0 w-[min(88vw,400px)] rounded-r-sheet",
  right: "inset-y-0 right-0 w-[min(88vw,400px)] rounded-l-sheet",
};

const WIDTH = { sm: "lg:w-[360px]", md: "lg:w-[420px]", lg: "lg:w-[520px]" };
const CENTER_WIDTH = { sm: "lg:w-[min(440px,calc(100vw-48px))]", md: "lg:w-[min(560px,calc(100vw-48px))]", lg: "lg:w-[min(720px,calc(100vw-48px))]" };

function desktopClasses(side: SheetDesktopSide, size: "sm" | "md" | "lg") {
  switch (side) {
    case "left":
      return cx("lg:left-0 lg:right-auto lg:top-0 lg:bottom-0 lg:max-h-none lg:rounded-none lg:rounded-r-sheet lg:pb-0", WIDTH[size]);
    case "right":
      return cx("lg:left-auto lg:right-0 lg:top-0 lg:bottom-0 lg:max-h-none lg:rounded-none lg:rounded-l-sheet lg:pb-0", WIDTH[size]);
    case "top":
      return cx(
        "lg:inset-x-0 lg:mx-auto lg:top-3 lg:bottom-auto lg:max-h-[min(680px,calc(100dvh-24px))] lg:rounded-sheet lg:pb-0",
        CENTER_WIDTH[size]
      );
    case "center":
      return cx(
        "lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[85dvh] lg:rounded-sheet lg:pb-0",
        CENTER_WIDTH[size]
      );
  }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let scrollLocks = 0;
let savedOverflow = "";
let savedPadding = "";

function lockScroll() {
  if (scrollLocks === 0) {
    const body = document.body;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    savedOverflow = body.style.overflow;
    savedPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
  }
  scrollLocks += 1;
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) {
    document.body.style.overflow = savedOverflow;
    document.body.style.paddingRight = savedPadding;
  }
}

/**
 * Bottom sheet on phones, drawer or dialog on desktop. Focus is trapped while
 * open, Esc and the backdrop close it, the page behind does not scroll, and
 * focus returns to the trigger afterwards. Nothing renders until the first
 * open, so a closed sheet costs no DOM and never touches hydration — always
 * start closed (open=false on the server).
 *
 *   const [open, setOpen] = useState(false);
 *   <Sheet open={open} onClose={() => setOpen(false)} title="Sort by" mobile="bottom" desktop="right">…</Sheet>
 */
export function Sheet({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  mobile = "bottom",
  desktop = "right",
  size = "md",
  initialFocusRef,
  returnFocusRef,
  footer,
  header,
  className,
  bodyClassName,
  children,
}: SheetProps) {
  // The portal mounts on first open (never during SSR or hydration) and stays
  // mounted while the exit animation runs. `animIn` drives the slide/fade;
  // the root's data-state drives visibility, so focus works the moment it opens.
  const [present, setPresent] = useState(false);
  const [animIn, setAnimIn] = useState(false);
  const mounted = open || present;
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      const frame = window.requestAnimationFrame(() => {
        setPresent(true);
        setAnimIn(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const frame = window.requestAnimationFrame(() => setAnimIn(false));
    const timer = window.setTimeout(() => setPresent(false), 240);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [open]);

  // Open: lock scroll, move focus in, listen for Esc. Close: give focus back.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const active = document.activeElement as HTMLElement | null;
    if (active && panel && !panel.contains(active)) previousFocus.current = active;
    // Where focus goes after closing: the trigger the opener recorded, else what had focus.
    const returnTarget = returnFocusRef?.current ?? null;

    lockScroll();
    const frame = window.requestAnimationFrame(() => {
      const current = panelRef.current;
      if (!current || current.contains(document.activeElement)) return;
      const target = initialFocusRef?.current ?? current.querySelector<HTMLElement>(FOCUSABLE) ?? current;
      target.focus({ preventScroll: true });
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      unlockScroll();
      const back = returnTarget ?? previousFocus.current;
      previousFocus.current = null;
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
  }, [open, initialFocusRef, returnFocusRef]);

  const trapTab = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null || element === document.activeElement
    );
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!mounted || typeof document === "undefined") return null;

  const state = open ? "open" : "closed";
  const anim = open && animIn ? "in" : "out";

  return createPortal(
    <div className="ca-sheet-root" data-state={state} inert={!open}>
      <div aria-hidden="true" className="ca-sheet-backdrop absolute inset-0 bg-ink/50" data-anim={anim} onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        data-state={state}
        data-anim={anim}
        data-mobile={mobile}
        data-desktop={desktop}
        onKeyDown={trapTab}
        className={cx(
          "ca-sheet absolute flex flex-col bg-card text-ink shadow-raised outline-none",
          MOBILE[mobile],
          desktopClasses(desktop, size),
          className
        )}
      >
        {mobile === "bottom" ? (
          <span aria-hidden="true" className={cx("mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong", desktop !== "center" && "lg:hidden")} />
        ) : null}
        {header ?? (
          <div className={cx("flex shrink-0 items-start gap-3 pl-4 pr-2 pt-2 lg:pl-6 lg:pr-3 lg:pt-3", hideTitle ? "justify-end" : "border-b border-line pb-2")}>
            <div className={cx("min-w-0 flex-1 py-2.5", hideTitle && "sr-only")}>
              <h2 id={titleId} className="type-h3 text-ink">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-0.5 text-[14px] leading-5 text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-card text-ink hover:bg-ink/5"
            >
              <IconClose size={22} />
            </button>
          </div>
        )}
        {header ? (
          <span id={titleId} className="sr-only">
            {title}
          </span>
        ) : null}
        <div className={cx("min-h-0 flex-1 overflow-y-auto overscroll-contain", bodyClassName)}>{children}</div>
        {footer ? <div className="shrink-0 border-t border-line bg-card px-4 py-3 lg:px-6">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
