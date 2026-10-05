import type { MetadataRoute } from "next";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { CATEGORY_GROUPS, categoryInfo } from "@/lib/categories";
import { absoluteUrl } from "@/lib/site";

// Built per request from the database, so new products appear without a
// redeploy and the build never needs a database connection.
export const dynamic = "force-dynamic";

const STATIC_PAGES = [
  { path: "/", priority: 1 },
  { path: "/why-genuine", priority: 0.6 },
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

    // Canonical slug URLs, the form the storefront links to (/category/amplifier-ics;
    // old /category/amplifier%20ic URLs redirect there), plus department pages for
    // groups that span two or more categories (/category/semiconductors).
    const categories = [...new Set(products.map((p) => categoryInfo(p.category).raw).filter(Boolean))];
    const categoryPaths = new Set(categories.map((raw) => categoryInfo(raw).href));
    for (const group of CATEGORY_GROUPS) {
      const present = categories.filter((raw) => categoryInfo(raw).group === group.id);
      if (present.length >= 2) categoryPaths.add(`/category/${group.slug}`);
    }
    for (const path of categoryPaths) {
      entries.push({
        url: absoluteUrl(path),
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
