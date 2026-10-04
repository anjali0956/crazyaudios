"use client";

import { SessionProvider } from "next-auth/react";
import { CategoryProvider } from "./components/CategoryContext";
import { CartProvider } from "./components/cart/CartProvider";
import { ToastProvider } from "./components/ui/Toast";
import { useEffect } from "react";
import axios from "axios";
import { usePathname } from "next/navigation";

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

// The storefront header now lives in app/components/chrome (rendered by the
// root layout); this file keeps the app-wide providers and traffic logging.
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

    axios.post("/api/traffic", { path: pathname, visitorId }).catch(() => {});
  }, [pathname]);

  return (
    <SessionProvider>
      <ToastProvider>
        <CartProvider>
          <CategoryProvider>{children}</CategoryProvider>
        </CartProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
