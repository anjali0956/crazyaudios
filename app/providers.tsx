"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CartProvider } from "./components/cart/CartProvider";
import { ToastProvider } from "./components/ui/Toast";

const safeLocalStorage = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  },
};

const createVisitorId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

/**
 * POSTs { path, visitorId } as JSON to /api/traffic. A beacon is queued by the
 * browser at low priority (it never competes with the page) and survives
 * navigation; fetch with keepalive is the fallback. No axios in the shared bundle.
 */
function logTraffic(path: string, visitorId: string) {
  const body = JSON.stringify({ path, visitorId });
  try {
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/traffic", new Blob([body], { type: "application/json" }))) {
      return;
    }
  } catch {
    // Some browsers refuse a JSON Blob in a beacon; fall back to fetch.
  }
  fetch("/api/traffic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

// The storefront header lives in app/components/chrome (rendered by the root
// layout); this file keeps the app-wide providers and traffic logging. There is
// no next-auth SessionProvider: pages read the session on the server, the menu
// fetches it when opened, and signIn/signOut work without a provider.
export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (
      !pathname ||
      pathname === "/preview" ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/api")
    ) {
      return;
    }

    let visitorId = safeLocalStorage.get("trafficVisitorId");

    if (!visitorId) {
      visitorId = createVisitorId();
      safeLocalStorage.set("trafficVisitorId", visitorId);
    }

    logTraffic(pathname, visitorId);
  }, [pathname]);

  return (
    <ToastProvider>
      <CartProvider>{children}</CartProvider>
    </ToastProvider>
  );
}
