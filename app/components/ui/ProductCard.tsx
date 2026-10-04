import Link from "next/link";
import { AddToCartButton } from "@/app/components/cart/AddToCartButton";
import { categoryLabel } from "@/lib/categories";
import { displayName } from "@/lib/display";
import { brandOf, formatDiscount, pricingOf } from "@/lib/format";
import { descriptorOf } from "@/lib/parts";
import { Badge } from "./Badge";
import { ButtonLink } from "./Button";
import { cx } from "./cx";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { StockStatus } from "./StockStatus";

/** Fields a card needs. A CatalogProduct (lib/catalog) satisfies it. */
export type ProductCardData = {
  _id: string;
  name: string;
  image: string;
  /** Stored GST-inclusive price (before any flash sale). */
  price: number;
  stock: number;
  category?: string;
  description?: string[];
  packSize?: number | null;
  flashSale?: boolean;
  discountPercentage?: number;
  /** Precomputed brand (CatalogProduct.brand); derived from the description when absent. */
  brand?: string | null;
  /** Precomputed PART_INFO descriptor (CatalogProduct.descriptor); derived when absent. */
  descriptor?: string | null;
};

export const PRODUCT_CARD_SIZES = "(min-width: 1100px) 270px, (min-width: 768px) 31vw, 46vw";

export type ProductCardProps = {
  product: ProductCardData;
  /** Load the photo eagerly (first row of a grid). */
  priority?: boolean;
  /** next/image sizes; the default matches <ProductGrid>. */
  sizes?: string;
  /** Heading level for the product name (h3 under a section h2, h2 directly under a page h1). */
  headingLevel?: "h2" | "h3";
  className?: string;
};

/**
 * Product tile: photo on white, brand kicker, display name (+ part descriptor
 * such as "NPN audio power transistor"), price, stock and "Add to cart" (or
 * "View" when out of stock). The name link covers the whole card; the button
 * sits above it, so no control is nested in a link. The cart and Meta Pixel
 * receive the raw product name.
 */
export function ProductCard({ product, priority = false, sizes = PRODUCT_CARD_SIZES, headingLevel = "h3", className }: ProductCardProps) {
  const pricing = pricingOf(product);
  const brand = product.brand !== undefined ? product.brand : brandOf(product);
  const kicker = brand || categoryLabel(product.category || "") || "CrazyAudios";
  // The kicker already names the brand, so the title can drop a "Peerless by Tymphany" prefix.
  const title = displayName(product, { dropBrand: Boolean(brand) });
  const descriptor = product.descriptor !== undefined ? product.descriptor : descriptorOf(product);
  const href = `/product/${product._id}`;
  const nameId = `pc-${product._id}`;
  const inStock = Math.floor(Number(product.stock) || 0) >= pricing.packSize;
  const Heading = headingLevel;

  return (
    <article
      className={cx(
        "group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-card transition-colors duration-150 hover:border-line-strong",
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-signal-ink",
        className
      )}
    >
      <div className="relative aspect-square border-b border-line bg-card">
        <ProductImage
          src={product.image}
          alt={displayName(product)}
          fill
          sizes={sizes}
          priority={priority}
          className={cx("object-contain p-[11%]", !inStock && "opacity-60")}
        />
        {pricing.onSale ? (
          <Badge tone="signal" className="absolute left-2 top-2">
            Sale {formatDiscount(pricing.discount)}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3 lg:p-3.5">
        <p className="truncate font-mono text-[11px] font-medium uppercase leading-4 tracking-[0.1em] text-muted" title={kicker}>
          {kicker}
        </p>
        <div className="mt-1 min-h-10">
          <Heading id={nameId} className="line-clamp-2 text-[15px] font-semibold leading-5 tracking-normal text-ink">
            <Link
              href={href}
              className="outline-none after:absolute after:inset-0 after:z-[1] after:content-[''] group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-[3px]"
            >
              {title}
            </Link>
          </Heading>
          {descriptor ? <p className="line-clamp-1 text-[13px] leading-5 text-ink-2">{descriptor}</p> : null}
        </div>
        <Price
          size="sm"
          price={pricing.sellPrice}
          mrp={pricing.sellMrp}
          unit={pricing.packSize > 1 ? `pack of ${pricing.packSize}` : undefined}
          showTax={false}
          className="mt-2"
        />
        <StockStatus stock={product.stock} packSize={product.packSize} compact className="mt-1" />
        <div className="relative z-[2] mt-auto pt-3">
          {inStock ? (
            <AddToCartButton
              describedBy={nameId}
              product={{
                _id: product._id,
                name: product.name,
                price: product.price,
                image: product.image,
                stock: product.stock,
                packSize: product.packSize,
                flashSale: product.flashSale,
                discountPercentage: product.discountPercentage,
                category: product.category,
              }}
            />
          ) : (
            <ButtonLink href={href} variant="outline" size="sm" fullWidth aria-describedby={nameId}>
              View
            </ButtonLink>
          )}
        </div>
      </div>
    </article>
  );
}
