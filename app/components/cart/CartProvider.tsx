"use client";

import { usePathname } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { trackPixelEvent } from "@/lib/meta-pixel";
import { useToast } from "@/app/components/ui/Toast";
import { formatNumber } from "@/lib/format";
import { displayName } from "@/lib/display";
import {
  CART_EVENT,
  CART_STORAGE_KEY,
  cartTotals,
  currentItems,
  displayPrices,
  getServerSnapshot,
  getSnapshot,
  type CartState,
  maxQuantity,
  normalizeQuantity,
  packStep,
  subscribe,
  syncFromStorage,
  writeItems,
  type CartItem,
  type CartProductInput,
} from "./cart-store";

export type { CartItem, CartProductInput } from "./cart-store";

export type AddResult = {
  ok: boolean;
  /** Units actually added (0 when refused). */
  added: number;
  /** Units of this product in the cart afterwards. */
  quantity: number;
  reason?: "out_of_stock" | "max_reached" | "capped";
};

export type ReconcileProduct = {
  _id: string;
  name: string;
  price: number;
  image?: string;
  stock?: number;
  packSize?: number | null;
  flashSale?: boolean;
  discountPercentage?: number;
  category?: string;
};

export type ReconcileReport = {
  removed: string[];
  capped: string[];
  priceChanged: string[];
};

export type CartActions = {
  /**
   * Add a product (raw stored price; display price is computed with
   * getDisplayPrice). Quantity defaults to one pack. Caps at stock, refuses
   * out-of-stock items, shows a toast and fires the Meta AddToCart event.
   */
  addItem: (product: CartProductInput, quantity?: number, options?: { silent?: boolean }) => AddResult;
  /** Set a line's quantity (snapped to whole packs, capped at stock). Returns the stored quantity. */
  updateQty: (id: string, quantity: number) => number;
  remove: (id: string) => void;
  clear: () => void;
  /** Refresh prices/stock from live products; drops products that no longer exist. */
  reconcile: (products: ReconcileProduct[]) => ReconcileReport;
};

export type CartApi = CartActions & {
  items: CartItem[];
  /** False until the cart has been read from storage (avoid flashing "empty"). */
  ready: boolean;
  /** Sellable units: a pack counts once. Use for the header badge. */
  count: number;
  /** Raw units (sum of quantities). */
  units: number;
  /** Distinct products. */
  lines: number;
  /** Sum of price x quantity, GST incl. */
  subtotal: number;
};

/**
 * Keeps the cart store in sync with localStorage: on mount, on route changes
 * (pages that still write localStorage directly), when the tab regains focus
 * and when another tab changes the cart.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    syncFromStorage();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CART_STORAGE_KEY) syncFromStorage();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") syncFromStorage();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", syncFromStorage);
    window.addEventListener("pageshow", syncFromStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", syncFromStorage);
      window.removeEventListener("pageshow", syncFromStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    syncFromStorage();
  }, [pathname]);

  return <>{children}</>;
}

function sameProduct(item: CartItem, id: string) {
  return String(item._id) === String(id);
}

/**
 * Cart contents for rendering. Starts as the server snapshot (empty, not
 * ready) so hydration always matches the HTML, then follows the store. Store
 * changes are applied as transitions: a cart update can never force React to
 * hydrate other parts of the page synchronously.
 */
function useCartState(): CartState {
  const [state, setState] = useState<CartState>(getServerSnapshot);
  useEffect(() => {
    const update = () => startTransition(() => setState(getSnapshot()));
    const unsubscribe = subscribe(update);
    // Pick up a store that synced before this component subscribed.
    const timer = window.setTimeout(update, 0);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);
  return state;
}

/**
 * Cart actions without subscribing to cart contents (no re-render when the
 * cart changes). Use for buttons: product cards, buy bars.
 *
 *   const { addItem } = useCartActions();
 */
export function useCartActions(): CartActions {
  const toast = useToast();

  const addItem = useCallback<CartApi["addItem"]>(
    (product, quantity, options) => {
      const items = currentItems();
      const step = packStep(product);
      const stockKnown = product.stock !== undefined && product.stock !== null;
      const max = maxQuantity(product);
      const existing = items.find((item) => sameProduct(item, product._id));
      const inCart = existing?.quantity ?? 0;

      if (stockKnown && max < step) {
        if (!options?.silent) toast.error("Out of stock", { id: "cart", description: displayName(product.name) });
        return { ok: false, added: 0, quantity: inCart, reason: "out_of_stock" };
      }

      const requested = Math.max(step, Math.ceil(Math.max(1, Math.floor(Number(quantity) || step)) / step) * step);
      const target = Math.min(inCart + requested, max);
      const added = Math.max(0, target - inCart);
      const viewCart = { label: "View cart", href: "/cart" };

      if (added <= 0) {
        if (!options?.silent) {
          toast.warn(`Only ${formatNumber(max)} in stock`, {
            id: "cart",
            description: `All ${formatNumber(max)} are already in your cart`,
            action: viewCart,
          });
        }
        return { ok: false, added: 0, quantity: inCart, reason: "max_reached" };
      }

      const { inclusiveFinalPrice, inclusiveBasePrice } = displayPrices(product);
      const fields = {
        price: inclusiveFinalPrice,
        originalPrice: inclusiveBasePrice,
        flashSale: Boolean(product.flashSale),
        discountPercentage: product.discountPercentage || 0,
        packSize: product.packSize || null,
        ...(stockKnown ? { stock: Number(product.stock) } : null),
      };
      const next: CartItem[] = existing
        ? items.map((item) => (sameProduct(item, product._id) ? { ...item, ...fields, quantity: target } : item))
        : [
            ...items,
            {
              _id: String(product._id),
              name: product.name,
              image: product.image,
              category: product.category,
              ...fields,
              quantity: target,
            },
          ];
      writeItems(next);

      // Same payload the homepage and product page have always sent.
      trackPixelEvent("AddToCart", {
        content_ids: [product._id],
        content_type: "product",
        content_name: product.name,
        contents: [{ id: product._id, quantity: added, item_price: inclusiveFinalPrice }],
        value: Number((inclusiveFinalPrice * added).toFixed(2)),
        currency: "INR",
      });

      const capped = added < requested;
      if (!options?.silent) {
        if (capped) {
          toast.warn(`Only ${formatNumber(max)} in stock`, {
            id: "cart",
            description: `Added ${formatNumber(added)} · ${displayName(product.name)}`,
            action: viewCart,
          });
        } else {
          toast.success("Added to cart", {
            id: "cart",
            description: `${displayName(product.name)} × ${formatNumber(added)}`,
            action: viewCart,
          });
        }
      }
      return { ok: true, added, quantity: target, reason: capped ? "capped" : undefined };
    },
    [toast]
  );

  const updateQty = useCallback<CartApi["updateQty"]>((id, quantity) => {
    const items = currentItems();
    const item = items.find((entry) => sameProduct(entry, id));
    if (!item) return 0;
    const next = Math.max(packStep(item), normalizeQuantity(quantity, item));
    if (next !== item.quantity) {
      writeItems(items.map((entry) => (sameProduct(entry, id) ? { ...entry, quantity: next } : entry)));
    }
    return next;
  }, []);

  const remove = useCallback<CartApi["remove"]>((id) => {
    writeItems(currentItems().filter((item) => !sameProduct(item, id)));
  }, []);

  const clear = useCallback<CartApi["clear"]>(() => {
    writeItems([]);
  }, []);

  const reconcile = useCallback<CartApi["reconcile"]>((products) => {
    const report: ReconcileReport = { removed: [], capped: [], priceChanged: [] };
    const byId = new Map(products.map((product) => [String(product._id), product]));
    const next: CartItem[] = [];
    for (const item of currentItems()) {
      const live = byId.get(String(item._id));
      if (!live) {
        report.removed.push(item.name);
        continue;
      }
      const { inclusiveFinalPrice, inclusiveBasePrice } = displayPrices(live);
      if (inclusiveFinalPrice !== item.price) report.priceChanged.push(live.name);
      const updated: CartItem = {
        ...item,
        name: live.name,
        image: live.image ?? item.image,
        category: live.category ?? item.category,
        price: inclusiveFinalPrice,
        originalPrice: inclusiveBasePrice,
        flashSale: Boolean(live.flashSale),
        discountPercentage: live.discountPercentage || 0,
        packSize: live.packSize || null,
        stock: live.stock,
      };
      const max = maxQuantity(updated);
      if (max < packStep(updated)) {
        report.removed.push(live.name);
        continue;
      }
      const quantity = normalizeQuantity(updated.quantity, updated);
      if (quantity < updated.quantity) report.capped.push(live.name);
      next.push({ ...updated, quantity });
    }
    writeItems(next);
    return report;
  }, []);

  return useMemo(() => ({ addItem, updateQty, remove, clear, reconcile }), [addItem, updateQty, remove, clear, reconcile]);
}

/**
 * The cart, from any client component: contents, totals and actions.
 *
 *   const { count, subtotal, items, addItem } = useCart();
 *   <Button onClick={() => addItem(product)}>Add to cart</Button>
 */
export function useCart(): CartApi {
  const state = useCartState();
  const actions = useCartActions();
  const totals = useMemo(() => cartTotals(state.items), [state.items]);
  return useMemo(
    () => ({ items: state.items, ready: state.ready, ...totals, ...actions }),
    [state.items, state.ready, totals, actions]
  );
}

export { CART_EVENT, CART_STORAGE_KEY };
