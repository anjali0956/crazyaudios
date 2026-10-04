"use client";

import { useState } from "react";
import { AddToCartButton } from "@/app/components/cart/AddToCartButton";
import { useCart, type CartProductInput } from "@/app/components/cart/CartProvider";
import { IconBag, IconSliders } from "@/app/components/icons";
import { Button } from "@/app/components/ui/Button";
import { Checkbox, Input, Select } from "@/app/components/ui/Field";
import { QuantityStepper } from "@/app/components/ui/QuantityStepper";
import { Sheet, type SheetDesktopSide, type SheetMobileSide } from "@/app/components/ui/Sheet";
import { useToast } from "@/app/components/ui/Toast";
import { formatINR } from "@/lib/format";

/** Interactive demos for the style guide (toasts, sheets, stepper, cart). */
export function StyleguideDemos({ product, packProduct }: { product: CartProductInput; packProduct: CartProductInput }) {
  const toast = useToast();
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [packQty, setPackQty] = useState(Math.max(1, Number(packProduct.packSize) || 1));
  const [sheet, setSheet] = useState<null | { mobile: SheetMobileSide; desktop: SheetDesktopSide; title: string }>(null);
  const [pin, setPin] = useState("68200");
  const pinError = pin.length > 0 && !/^\d{6}$/.test(pin) ? "Enter a 6-digit PIN code" : null;

  return (
    <div className="grid gap-10">
      <section aria-labelledby="sg-toasts" className="grid gap-3">
        <h3 id="sg-toasts" className="type-h3">Toasts</h3>
        <p className="text-[14px] text-ink-2">Bottom centre, above sticky bars, auto-dismiss after 4 s (paused on hover/focus).</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Added to cart", { description: "TDA7294 × 1", action: { label: "View cart", href: "/cart" } })}
          >
            Success + action
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.warn("Only 1 in stock", { description: "All 1 are already in your cart", action: { label: "View cart", href: "/cart" } })}>
            Warning
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.error("Out of stock", { description: "USB / Bluetooth / FM Audio Player Module" })}>
            Error
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("PIN code saved", { description: "We’ll use 682001 for delivery estimates" })}>
            Info
          </Button>
        </div>
      </section>

      <section aria-labelledby="sg-cart" className="grid gap-3">
        <h3 id="sg-cart" className="type-h3">Cart store</h3>
        <p className="text-[14px] text-ink-2">
          useCart(): {cart.ready ? `${cart.count} in cart · subtotal ${formatINR(cart.subtotal)}` : "reading storage…"}. Adding caps at stock and
          fires the Meta AddToCart event.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper value={qty} onChange={setQty} max={product.stock} label={`Quantity for ${product.name}`} />
          <AddToCartButton product={product} quantity={qty} variant="primary" size="md" fullWidth={false} icon={<IconBag size={20} />} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper
            value={packQty}
            onChange={setPackQty}
            step={Math.max(1, Number(packProduct.packSize) || 1)}
            max={packProduct.stock}
            label={`Quantity for ${packProduct.name}`}
          />
          <AddToCartButton product={packProduct} quantity={packQty} variant="dark" size="md" fullWidth={false} label="Add packs" />
          <Button variant="ghost" size="md" onClick={() => cart.clear()}>
            Clear cart
          </Button>
        </div>
      </section>

      <section aria-labelledby="sg-sheets" className="grid gap-3">
        <h3 id="sg-sheets" className="type-h3">Sheets</h3>
        <p className="text-[14px] text-ink-2">Focus trap, Esc and backdrop close, body scroll lock, focus returns to the trigger.</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { mobile: "bottom", desktop: "right", title: "Bottom sheet / right drawer" },
              { mobile: "left", desktop: "left", title: "Left drawer" },
              { mobile: "top", desktop: "top", title: "Top sheet" },
              { mobile: "bottom", desktop: "center", title: "Bottom sheet / dialog" },
            ] as const
          ).map((option) => (
            <Button
              key={option.title}
              variant="outline"
              size="sm"
              icon={<IconSliders size={18} />}
              onClick={() => setSheet({ ...option })}
            >
              {option.title}
            </Button>
          ))}
        </div>
        <Sheet
          open={Boolean(sheet)}
          onClose={() => setSheet(null)}
          title={sheet?.title ?? "Sheet"}
          description="Sort and filter controls live in sheets like this one."
          mobile={sheet?.mobile ?? "bottom"}
          desktop={sheet?.desktop ?? "right"}
          footer={
            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={() => setSheet(null)}>
                Cancel
              </Button>
              <Button variant="primary" fullWidth onClick={() => setSheet(null)}>
                Apply
              </Button>
            </div>
          }
        >
          <div className="grid gap-4 p-4 lg:p-6">
            <Select label="Sort by" defaultValue="featured" name="sort">
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="newest">Newest</option>
            </Select>
            <Checkbox label="In stock only" defaultChecked />
            <Input
              label="PIN code"
              name="pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              hint="We use it for delivery estimates"
              error={pinError}
            />
          </div>
        </Sheet>
      </section>
    </div>
  );
}
