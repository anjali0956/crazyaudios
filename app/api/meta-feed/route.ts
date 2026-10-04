import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import formatCategoryName from "@/lib/formatCategoryName";
import { getProductBrand, getProductSummary, getSellablePrice } from "@/lib/product-info";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

// Product catalog feed for Meta Commerce Manager (Catalog → Data sources →
// Data feed → scheduled fetch of /api/meta-feed). RSS 2.0 with the g:
// namespace, which Meta and Google Merchant Center both accept.

export const dynamic = "force-dynamic";

type FeedProduct = {
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

function xmlEscape(value: unknown) {
  return String(value ?? "")
    // Characters XML 1.0 forbids would make Meta reject the whole feed.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(name: string, value: unknown) {
  return `<g:${name}>${xmlEscape(value)}</g:${name}>`;
}

function buildItem(product: FeedProduct) {
  const id = String(product._id);
  const { packSize, sellPrice, sellBasePrice, onSale } = getSellablePrice(product);
  const title = packSize > 1 ? `${product.name} (Pack of ${packSize})` : product.name;
  const description = getProductSummary(product, 5000) || product.name;
  const extraImages = (product.extraImages || []).filter(Boolean).slice(0, 10);

  const fields = [
    tag("id", id),
    tag("title", title.slice(0, 150)),
    tag("description", description),
    tag("availability", Number(product.stock) > 0 ? "in stock" : "out of stock"),
    tag("condition", "new"),
    tag("price", `${sellBasePrice.toFixed(2)} INR`),
    onSale ? tag("sale_price", `${sellPrice.toFixed(2)} INR`) : "",
    tag("link", absoluteUrl(`/product/${id}`)),
    tag("image_link", absoluteUrl(product.image)),
    ...extraImages.map((src) => tag("additional_image_link", absoluteUrl(src))),
    tag("brand", getProductBrand(product)),
    product.category ? tag("product_type", formatCategoryName(product.category)) : "",
  ].filter(Boolean);

  return `<item>${fields.join("")}</item>`;
}

export async function GET() {
  try {
    await dbConnect();
    const products = (await Product.find({ price: { $gt: 0 } })
      .sort({ createdAt: 1 })
      .lean()) as FeedProduct[];

    const items = products
      .filter((product) => product.name && product.image)
      .map(buildItem)
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${xmlEscape(SITE_NAME)}</title>
<link>${xmlEscape(SITE_URL)}</link>
<description>${xmlEscape(`${SITE_NAME} product catalog`)}</description>
${items}
</channel>
</rss>
`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=900",
      },
    });
  } catch (error) {
    console.error("Failed to build product feed:", error);
    return new Response("Failed to build product feed", { status: 500 });
  }
}
