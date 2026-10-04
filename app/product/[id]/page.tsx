import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WHY_GENUINE_HREF } from "@/app/components/chrome/links";
import { IconCash, IconCheck } from "@/app/components/icons";
import { ComplementCard } from "@/app/components/product/ComplementCard";
import { ProductGallery } from "@/app/components/product/ProductGallery";
import { ProductSpecs } from "@/app/components/product/ProductSpecs";
import { TrustStrip } from "@/app/components/product/TrustStrip";
import {
  galleryImagesOf,
  highlightsOf,
  inSentence,
  keySpecRows,
  metaDescription,
  packageChips,
  pageTitle,
  pdpBrand,
  pdpTitle,
  pdpTrustLine,
} from "@/app/components/product/product-view";
import type { PdpBuyProduct } from "@/app/components/product/types";
import { PartChip } from "@/app/components/ui/Badge";
import { Breadcrumbs, type Crumb } from "@/app/components/ui/Breadcrumbs";
import { Price } from "@/app/components/ui/Price";
import { ProductRail } from "@/app/components/ui/ProductGrid";
import { SectionHeader } from "@/app/components/ui/SectionHeader";
import { StockStatus } from "@/app/components/ui/StockStatus";
import {
  categoryInfo,
  complementOf,
  getAllProducts,
  getProduct,
  getRelatedProducts,
  isKnownWrongImage,
  type CatalogProduct,
} from "@/lib/catalog";
import { formatDiscount, formatINR } from "@/lib/format";
import { getProductBrand, getProductSummary, getSellablePrice } from "@/lib/product-info";
import { FREE_SHIPPING_THRESHOLD, isCodAllowed } from "@/lib/shipping-policy";
import shouldShowCaEmblem from "@/lib/shouldShowCaEmblem";
import { DEFAULT_OPEN_GRAPH, SITE_NAME, absoluteUrl, whatsappLink } from "@/lib/site";
import ProductDetailsClient from "./ProductDetailsClient";

// Ad landing page: served from the ISR cache, rebuilt at most once a minute.
export const revalidate = 60;

type PageProps = { params: Promise<{ id: string }> };

/** Pre-render every product at build when the database is reachable; otherwise render on first request. */
export async function generateStaticParams() {
  try {
    return (await getAllProducts()).map((product) => ({ id: product._id }));
  } catch {
    return [];
  }
}

/** Photos that may be shown or shared: main first, known-wrong photos (spec §16) left out. */
function shareablePhotos(product: CatalogProduct) {
  return [product.image, ...product.extraImages].filter((src) => src && !isKnownWrongImage(src));
}

// Link previews (Facebook, WhatsApp, Instagram) and search engines read this
// server-rendered head; they run no JavaScript.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  let product: CatalogProduct | null;
  try {
    product = await getProduct(id);
  } catch (error) {
    console.error("Failed to load product for metadata:", error);
    return { title: "Product" };
  }
  if (!product) return { title: "Product not found", robots: { index: false, follow: true } };

  const { sellPrice } = getSellablePrice(product);
  const inStock = Number(product.stock) > 0;
  const description = metaDescription(product, pdpBrand(product));
  const url = `/product/${product._id}`;
  const photos = shareablePhotos(product)
    .slice(0, 4)
    .map((src) => ({ url: absoluteUrl(src), alt: product.name }));
  // No usable photo: share the store image rather than a wrong one.
  const images: Array<{ url: string; alt: string; width?: number; height?: number }> = photos.length
    ? photos
    : DEFAULT_OPEN_GRAPH.images;

  return {
    title: pageTitle(product),
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_IN",
      url,
      title: product.name,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: images.map((image) => image.url),
    },
    other: {
      "product:price:amount": sellPrice.toFixed(2),
      "product:price:currency": "INR",
      "product:availability": inStock ? "in stock" : "out of stock",
      "product:condition": "new",
      "product:retailer_item_id": product._id,
      "product:brand": getProductBrand(product),
    },
  };
}

function productJsonLd(product: CatalogProduct) {
  const images = shareablePhotos(product).map(absoluteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product._id,
    ...(images.length ? { image: images } : null),
    description: getProductSummary(product, 500) || product.name,
    brand: { "@type": "Brand", name: getProductBrand(product) },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product._id}`),
      priceCurrency: "INR",
      price: getSellablePrice(product).sellPrice.toFixed(2),
      availability: Number(product.stock) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const [all, related] = await Promise.all([getAllProducts(), getRelatedProducts(product, 12)]);
  const complement = complementOf(product, all);
  // Same category (one listing per part); the department fills in only when the category is thin.
  const others = related.filter((item) => item._id !== complement?._id);
  const sameCategory = others.filter((item) => item.category === product.category);
  const rail = (sameCategory.length >= 4 ? sameCategory : others)
    .slice(0, 6)
    .map((item) => (isKnownWrongImage(item.image) ? { ...item, image: "" } : item));

  const brand = pdpBrand(product);
  const title = pdpTitle(product, brand);
  const category = categoryInfo(product.category);
  const inStock = product.stock >= product.minQty;
  const caCertified = shouldShowCaEmblem(product.category, product.name);
  const chips = packageChips(product);
  const productUrl = absoluteUrl(product.href);

  const priceNotes = ["Incl. GST"];
  if (product.minQty > 1) priceNotes.push(`${formatINR(product.displayPrice)} each`);
  if (FREE_SHIPPING_THRESHOLD > 0) {
    priceNotes.push(
      product.sellPrice >= FREE_SHIPPING_THRESHOLD ? "free shipping" : `free shipping over ${formatINR(FREE_SHIPPING_THRESHOLD)}`
    );
  }

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }];
  if (category.raw) crumbs.push({ label: category.label, href: category.href });
  crumbs.push({ label: title });

  const railSameCategory = rail.every((item) => item.category === product.category);
  const railTitle = railSameCategory ? `More ${inSentence(category.label)}` : "Related parts";

  const buy: PdpBuyProduct = {
    _id: product._id,
    name: product.name,
    price: product.price,
    image: product.image,
    stock: product.stock,
    packSize: product.packSize,
    flashSale: product.flashSale,
    discountPercentage: product.discountPercentage,
    category: product.category,
    title,
    sellPrice: product.sellPrice,
    unitPrice: product.displayPrice,
    minQty: product.minQty,
  };

  return (
    <main className="page-wrap pb-14 pt-1 lg:pb-20 lg:pt-3">
      <script
        type="application/ld+json"
        // JSON-LD must be inline; "<" is escaped so product text can't close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)).replace(/</g, "\\u003c") }}
      />
      {/* One line: earlier crumbs keep their width, a long product name truncates. */}
      <Breadcrumbs jsonLd items={crumbs} className="[&_li:not(:last-child)]:shrink-0 [&_ol]:flex-nowrap" />

      <div className="mt-1 grid gap-4 lg:mt-3 lg:grid-cols-2 lg:gap-x-12">
        <div className="min-w-0 lg:sticky lg:top-[88px] lg:self-start">
          <ProductGallery
            images={galleryImagesOf(product)}
            alt={product.displayName}
            saleLabel={product.onSale ? `Sale ${formatDiscount(product.discount)}` : null}
            speaker={category.group === "speaker-drivers"}
            photosHref={whatsappLink(`Hi CrazyAudios, could you send me photos of ${product.name}? ${productUrl}`)}
            contentName={product.name}
          />
        </div>

        <div className="min-w-0 lg:pt-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="type-kicker text-muted">{brand ?? category.label}</p>
            {caCertified ? (
              <Link
                href={WHY_GENUINE_HREF}
                prefetch={false}
                className="relative inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-[3px] font-mono text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-ok underline-offset-2 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] hover:underline"
              >
                <IconCheck size={12} strokeWidth={3} />
                CA Certified
                <span className="sr-only">: why genuine parts matter</span>
              </Link>
            ) : null}
          </div>

          <h1 className="type-h1 mt-2 break-words text-ink">{title}</h1>
          {product.descriptor ? (
            <p className="mt-1.5 text-[16px] leading-6 text-ink-2 lg:text-[17px] lg:leading-[26px]">{product.descriptor}</p>
          ) : null}
          {chips.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <PartChip key={chip}>{chip}</PartChip>
              ))}
            </div>
          ) : null}

          <Price
            className="mt-4"
            size="lg"
            price={product.sellPrice}
            mrp={product.sellMrp}
            unit={product.minQty > 1 ? `pack of ${product.minQty}` : undefined}
            taxNote={priceNotes.join(" · ")}
          />

          <div className="mt-4">
            <StockStatus stock={product.stock} packSize={product.packSize} />
            {inStock ? (
              <p className="mt-0.5 pl-4 text-[14px] leading-5 text-ink-2">Ships today if ordered before 2 PM (Mon–Sat)</p>
            ) : null}
          </div>

          {inStock && !isCodAllowed(product.sellPrice) ? (
            <p className="mt-4 flex gap-2.5 rounded-card border border-line bg-card px-3.5 py-3 text-[14px] leading-5 text-ink-2">
              <IconCash size={18} className="mt-px shrink-0 text-muted" />
              <span>
                <strong className="font-semibold text-ink">Prepaid only</strong> · pay by UPI, card or netbanking
              </span>
            </p>
          ) : null}

          <ProductDetailsClient
            product={buy}
            askHref={whatsappLink(`Hi CrazyAudios, I have a question about ${product.name}: ${productUrl}`)}
            restockHref={whatsappLink(`Hi CrazyAudios, is ${product.name} back in stock? ${productUrl}`)}
            complement={complement ? <ComplementCard className="mt-4" product={complement} /> : null}
          />

          <TrustStrip className="mt-4" line={pdpTrustLine(product, brand)} qualityChecked={caCertified} />
        </div>
      </div>

      {/* Below the fold: content-visibility defers layout, paint and image loads until near the screen. */}
      <ProductSpecs
        className="mt-10 border-t border-line pt-8 [contain-intrinsic-size:auto_640px] [content-visibility:auto] lg:mt-16 lg:pt-14"
        title={title}
        rows={keySpecRows(product, brand)}
        highlights={highlightsOf(product)}
      />

      {rail.length ? (
        <section
          aria-labelledby="pdp-related"
          className="mt-10 border-t border-line pt-8 [contain-intrinsic-size:auto_560px] [content-visibility:auto] lg:mt-16 lg:pt-14"
        >
          <SectionHeader id="pdp-related" kicker={category.groupLabel} title={railTitle} href={category.raw ? category.href : undefined} />
          <ProductRail className="mt-5" products={rail} label={railTitle} />
        </section>
      ) : null}
    </main>
  );
}
