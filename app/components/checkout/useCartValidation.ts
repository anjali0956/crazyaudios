"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCart, type ReconcileProduct } from "@/app/components/cart/CartProvider";
import {
  currentItems,
  displayPrices,
  maxQuantity,
  normalizeQuantity,
  packStep,
} from "@/app/components/cart/cart-store";
import { useToast } from "@/app/components/ui/Toast";
import { displayName } from "@/lib/display";
import { formatINR, formatNumber } from "@/lib/format";

/** What changed on one cart line during the check (shown under the line). */
export type LineNotice = { price?: string; quantity?: string };
export type RemovedLine = { id: string; name: string; reason: "unavailable" | "out_of_stock" };
export type CartCheckStatus = "idle" | "checking" | "done" | "error";

export type CartCheck = {
  /** idle until the cart has loaded; done/error once the live check finished (error = cart kept as is). */
  status: CartCheckStatus;
  notices: Record<string, LineNotice>;
  removed: RemovedLine[];
  /** Run the check again (e.g. after the server said an item went out of stock). */
  recheck: () => void;
};

/** One entry of POST /api/cart/validate. */
type LiveProduct = {
  productId: string;
  found: boolean;
  name?: string;
  image?: string;
  category?: string;
  price?: number;
  flashSale?: boolean;
  discountPercentage?: number;
  stock?: number;
  packSize?: number | null;
};

type Result = {
  run: number;
  status: "done" | "error";
  notices: Record<string, LineNotice>;
  removed: RemovedLine[];
};

const NO_NOTICES: Record<string, LineNotice> = {};
const NO_REMOVED: RemovedLine[] = [];

/**
 * Compares the stored cart with live products, writes the fixes through the
 * cart store's reconcile() (prices, stock caps, removed products) and reports
 * what changed. Products added to the cart while the request was in flight
 * are passed through untouched.
 */
function applyLiveProducts(products: LiveProduct[], reconcile: (live: ReconcileProduct[]) => unknown) {
  const byId = new Map(products.map((product) => [String(product.productId), product]));
  const notices: Record<string, LineNotice> = {};
  const removed: RemovedLine[] = [];
  const live: ReconcileProduct[] = [];

  for (const item of currentItems()) {
    const found = byId.get(String(item._id));
    if (!found) {
      // Not part of this check: keep it exactly as stored.
      live.push({
        _id: item._id,
        name: item.name,
        price: Number(item.originalPrice ?? item.price) || 0,
        image: item.image,
        stock: item.stock,
        packSize: item.packSize ?? null,
        flashSale: item.flashSale,
        discountPercentage: item.discountPercentage,
        category: item.category,
      });
      continue;
    }
    if (!found.found) {
      removed.push({ id: item._id, name: displayName(item.name), reason: "unavailable" });
      continue;
    }

    const product: ReconcileProduct = {
      _id: item._id,
      name: found.name || item.name,
      price: Number(found.price) || 0,
      image: found.image || item.image,
      stock: Math.max(0, Number(found.stock) || 0),
      packSize: found.packSize ?? null,
      flashSale: Boolean(found.flashSale),
      discountPercentage: Number(found.discountPercentage) || 0,
      category: found.category || item.category,
    };
    live.push(product);

    const max = maxQuantity(product);
    if (max < packStep(product)) {
      removed.push({ id: item._id, name: displayName(product.name), reason: "out_of_stock" });
      continue;
    }

    const notice: LineNotice = {};
    const { inclusiveFinalPrice } = displayPrices(product);
    if (Math.abs(inclusiveFinalPrice - Number(item.price)) > 0.004) {
      notice.price = `Price ${inclusiveFinalPrice > Number(item.price) ? "went up" : "dropped"}: was ${formatINR(Number(item.price))}`;
    }
    if (normalizeQuantity(item.quantity, product) < item.quantity) {
      notice.quantity = `Only ${formatNumber(max)} in stock, so we lowered the quantity`;
    }
    if (notice.price || notice.quantity) notices[item._id] = notice;
  }

  reconcile(live);
  return { notices, removed };
}

function changeSummary(
  notices: Record<string, LineNotice>,
  removed: RemovedLine[],
  nameOf: (id: string) => string
) {
  const parts: string[] = [];
  for (const line of removed) {
    parts.push(`${line.name} ${line.reason === "out_of_stock" ? "is out of stock" : "is no longer available"} and was removed`);
  }
  for (const [id, notice] of Object.entries(notices)) {
    if (notice.price) parts.push(`${nameOf(id)}: price changed`);
    if (notice.quantity) parts.push(`${nameOf(id)}: quantity lowered to what's in stock`);
  }
  if (!parts.length) return "";
  const shown = parts.slice(0, 2).join(". ");
  return parts.length > 2 ? `${shown}, and ${parts.length - 2} more.` : `${shown}.`;
}

/**
 * Re-validates the cart against current products once it has loaded (cart
 * page and checkout), fixes it and tells the customer with a toast.
 */
export function useCartValidation({ announce = true }: { announce?: boolean } = {}): CartCheck {
  const { items, ready, reconcile } = useCart();
  const toast = useToast();
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const startedRun = useRef(-1);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !items.length || startedRun.current === run) return;
    startedRun.current = run;
    const thisRun = run;
    const payload = items.map((item) => ({ productId: item._id, quantity: item.quantity }));

    (async () => {
      let next: Result;
      try {
        const res = await fetch("/api/cart/validate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: payload }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { products?: LiveProduct[] };
        const { notices, removed } = applyLiveProducts(Array.isArray(data.products) ? data.products : [], reconcile);
        next = { run: thisRun, status: "done", notices, removed };
      } catch {
        // Keep the cart as it is; the server checks every order again.
        next = { run: thisRun, status: "error", notices: NO_NOTICES, removed: NO_REMOVED };
      }
      if (!mounted.current) return;
      setResult(next);

      if (announce && next.status === "done") {
        const names = new Map(currentItems().map((item) => [String(item._id), displayName(item.name)]));
        const summary = changeSummary(next.notices, next.removed, (id) => names.get(id) || "An item");
        if (summary) {
          toast.warn("We updated your cart", { id: "cart-check", description: summary, duration: 7000 });
        }
      }
    })();
  }, [ready, items, run, reconcile, toast, announce]);

  const recheck = useCallback(() => setRun((value) => value + 1), []);

  const current = result && result.run === run ? result : null;
  const status: CartCheckStatus = !ready ? "idle" : current ? current.status : items.length ? "checking" : "done";

  return {
    status,
    notices: current?.notices ?? result?.notices ?? NO_NOTICES,
    removed: current?.removed ?? result?.removed ?? NO_REMOVED,
    recheck,
  };
}
