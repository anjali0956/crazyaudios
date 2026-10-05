import type { Metadata } from "next";
import { cache } from "react";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getProductBrand, getProductSummary, getSellablePrice } from "@/lib/product-info";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import ProductDetailsClient from "./ProductDetailsClient";

type PageProps = { params: Promise<{ id: string }> };

type ProductRecord = {
  _id: unknown;
  name: string;
  price: number;
  image: string;
  extraImages?: string[];
  description?: string[];
  category?: string;
  stock?: number;
  packSize?: number | null;
  flashSale?: boolean;
  discountPercentage?: number;
};

// Shared by generateMetadata and the page within one request.
const getProduct = cache(async (id: string): Promise<ProductRecord | null> => {
  if (!mongoose.isValidObjectId(id)) return null;
  try {
    await dbConnect();
    return (await Product.findById(id).lean()) as ProductRecord | null;
  } catch (error) {
    console.error("Failed to load product for metadata:", error);
    return null;
  }
});

// Link previews (Facebook, WhatsApp, Instagram) and search engines read this
// server-rendered head; they don't run the client-side product fetch.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Product" };

  const { packSize, sellPrice } = getSellablePrice(product);
  const inStock = Number(product.stock) > 0;
  const priceText = `Rs ${sellPrice}${packSize > 1 ? ` (pack of ${packSize})` : ""} incl. GST`;
  const summary = getProductSummary(product, 150);
  const description = [priceText, inStock ? "In stock" : "Out of stock", summary]
    .filter(Boolean)
    .join(" · ");
  const url = `/product/${id}`;
  const images = [product.image, ...(product.extraImages || [])]
    .filter(Boolean)
    .slice(0, 4)
    .map((src) => ({ url: absoluteUrl(src), alt: product.name }));

  return {
    title: product.name,
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
      "product:retailer_item_id": id,
      "product:brand": getProductBrand(product),
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);

  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        sku: id,
        image: [product.image, ...(product.extraImages || [])].filter(Boolean).map(absoluteUrl),
        description: getProductSummary(product, 500) || product.name,
        brand: { "@type": "Brand", name: getProductBrand(product) },
        offers: {
          "@type": "Offer",
          url: absoluteUrl(`/product/${id}`),
          priceCurrency: "INR",
          price: getSellablePrice(product).sellPrice.toFixed(2),
          availability:
            Number(product.stock) > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: SITE_NAME },
        },
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // JSON-LD must be inline; "<" is escaped so product text can't close the tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      ) : null}
      <ProductDetailsClient />
    </>
  );
}
