import Link from "next/link";
import { AddToCartButton } from "@/app/components/cart/AddToCartButton";
import { ProductImage } from "@/app/components/ui/ProductImage";
import { cx } from "@/app/components/ui/cx";
import type { CatalogProduct } from "@/lib/catalog";
import { isKnownWrongImage } from "@/lib/display";
import { formatINR } from "@/lib/format";

/**
 * "Complementary part" (spec §11.4): the NPN/PNP partner of a transistor
 * (2SC5200 ↔ 2SA1943, TIP35 ↔ TIP36, …). The whole card links to the partner;
 * the Add button sits above the link, never inside it.
 */
export function ComplementCard({ product, className }: { product: CatalogProduct; className?: string }) {
  const titleId = `pdp-complement-${product._id}`;
  const inStock = product.stock >= product.minQty;
  return (
    <section
      aria-labelledby={`${titleId}-kicker`}
      className={cx(
        "relative flex items-center gap-3 rounded-card border border-line bg-card p-3 transition-colors duration-150 hover:border-line-strong",
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-signal-ink",
        className
      )}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-chip border border-line bg-card">
        <ProductImage
          src={isKnownWrongImage(product.image) ? null : product.image}
          alt=""
          fill
          sizes="64px"
          className="object-contain p-1.5"
        />
      </div>
      <div className="min-w-0 flex-1">
        {/* One line at 360 px (it wrapped as "COMPLEMENTARY / PART" there): tighter tracking on phones. */}
        <h2
          id={`${titleId}-kicker`}
          className="type-kicker truncate text-[11px] leading-4 tracking-[0.05em] text-signal-ink [font-stretch:100%] min-[400px]:tracking-[0.1em]"
        >
          Complementary part
        </h2>
        <p className="mt-0.5 flex min-w-0 items-baseline gap-2 text-[16px] leading-6">
          <Link
            id={titleId}
            href={product.href}
            className="truncate font-semibold text-ink outline-none after:absolute after:inset-0 after:z-[1] after:rounded-card after:content-[''] hover:underline hover:decoration-line-strong hover:underline-offset-[3px]"
          >
            {product.displayName}
          </Link>
          <span className="type-price shrink-0 text-[15px] text-ink">{formatINR(product.sellPrice)}</span>
        </p>
        <p className="line-clamp-2 text-[13px] leading-[18px] text-ink-2">{product.descriptor ?? product.categoryLabel}</p>
      </div>
      <div className="relative z-[2] shrink-0">
        {inStock ? (
          <AddToCartButton
            describedBy={titleId}
            fullWidth={false}
            size="sm"
            variant="outline"
            label="Add"
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
          <span className="text-[13px] font-semibold text-danger">Out of stock</span>
        )}
      </div>
    </section>
  );
}
