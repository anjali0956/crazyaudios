"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/app/components/ui/Button";
import { IconCheck, IconPlus } from "@/app/components/icons";
import { useCartActions, type AddResult, type CartProductInput } from "./CartProvider";

export type AddToCartButtonProps = {
  /** Product as stored (raw `price`), e.g. a CatalogProduct or /api/products item. */
  product: CartProductInput;
  /** Units to add (default: one pack / 1). */
  quantity?: number;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  label?: string;
  icon?: ReactNode;
  /** id of the element naming the product (cards), for screen readers. */
  describedBy?: string;
  className?: string;
  onAdded?: (result: AddResult) => void;
};

/**
 * "Add to cart" wired to the cart store (stock cap, toast, Meta AddToCart).
 * Briefly confirms with "Added" after a successful add.
 *
 *   <AddToCartButton product={product} variant="primary" size="lg" fullWidth />
 */
export function AddToCartButton({
  product,
  quantity,
  variant = "outline",
  size = "sm",
  fullWidth = true,
  label = "Add to cart",
  icon,
  describedBy,
  className,
  onAdded,
}: AddToCartButtonProps) {
  const { addItem } = useCartActions();
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Button
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      aria-describedby={describedBy}
      icon={justAdded ? <IconCheck size={18} strokeWidth={2.25} /> : icon ?? <IconPlus size={18} />}
      onClick={() => {
        const result = addItem(product, quantity);
        onAdded?.(result);
        if (result.ok) {
          setJustAdded(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setJustAdded(false), 1600);
        }
      }}
    >
      {justAdded ? "Added" : label}
    </Button>
  );
}
