import { useEffect, useState } from "react";

export type LazyModule<T> = {
  /** The module once it has loaded, else null. */
  get: () => T | null;
  /** Starts (or joins) the load. Safe to call repeatedly; a failed load can be retried. */
  preload: () => Promise<T>;
};

/**
 * A client module fetched on demand instead of with every page: on intent
 * (pointerdown / focus on its trigger), on first use, or when the browser is
 * idle after the page has loaded. Never competes with LCP.
 *
 *   const menuBody = lazyModule(() => import("./MenuBody"));
 */
export function lazyModule<T>(load: () => Promise<T>): LazyModule<T> {
  let value: T | null = null;
  let pending: Promise<T> | null = null;
  return {
    get: () => value,
    preload() {
      pending ??= load().then(
        (mod) => (value = mod),
        (error: unknown) => {
          pending = null;
          throw error;
        }
      );
      return pending;
    },
  };
}

/**
 * The module while `wanted` (e.g. a sheet is open), loading it if needed.
 * Already-loaded modules render in the same pass, so a sheet opened with
 * flushSync still has its content (and focus target) synchronously.
 */
export function useLazyModule<T>(mod: LazyModule<T>, wanted: boolean): T | null {
  const [, setLoaded] = useState(false);
  const value = mod.get();
  useEffect(() => {
    if (!wanted || value) return;
    let active = true;
    mod.preload().then(
      () => {
        if (active) setLoaded(true);
      },
      () => {}
    );
    return () => {
      active = false;
    };
  }, [mod, wanted, value]);
  return value;
}

/** Runs `task` once the page has finished loading and the main thread is idle. Returns a cancel function. */
export function onIdleAfterLoad(task: () => void) {
  let idle = 0;
  let timer = 0;
  const schedule = () => {
    if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(() => task(), { timeout: 4000 });
    else timer = window.setTimeout(task, 1500);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    window.removeEventListener("load", schedule);
    if (idle && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
    if (timer) window.clearTimeout(timer);
  };
}
