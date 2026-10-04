import type { MetadataRoute } from "next";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { absoluteUrl } from "@/lib/site";

// Built per request from the database, so new products appear without a
// redeploy and the build never needs a database connection.
export const dynamic = "force-dynamic";

const STATIC_PAGES = [
  { path: "/", priority: 1 },
  { path: "/about-us", priority: 0.5 },
  { path: "/contact-us", priority: 0.5 },
  { path: "/faq", priority: 0.4 },
  { path: "/shipping-refund", priority: 0.4 },
  { path: "/track-your-order", priority: 0.3 },
  { path: "/privacy-policy", priority: 0.2 },
  { path: "/terms-of-service", priority: 0.2 },
];

type ProductRow = { _id: unknown; category?: string; updatedAt?: Date };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, priority }) => ({
    url: absoluteUrl(path),
    changeFrequency: "weekly",
    priority,
  }));

  try {
    await dbConnect();
    const products = (await Product.find({}, { _id: 1, category: 1, updatedAt: 1 }).lean()) as ProductRow[];

    const categories = [...new Set(products.map((p) => p.category).filter(Boolean) as string[])];
    for (const category of categories) {
      // Same URL form the storefront links to (app/HomeClient.tsx, CategoryDropdown).
      entries.push({
        url: absoluteUrl(`/category/${encodeURIComponent(category)}`),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const product of products) {
      entries.push({
        url: absoluteUrl(`/product/${String(product._id)}`),
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (error) {
    // Still serve the static pages if the database is unreachable.
    console.error("sitemap: failed to load products", error);
  }

  return entries;
}
