import { NextResponse } from "next/server";
import { dedupeByDisplayName, getAllProducts, type CatalogProduct } from "@/lib/catalog";
import { searchProducts, type SearchSuggestion } from "@/lib/search";

// Instant search for the header. Scores the cached catalogue in memory, so
// a keystroke never reaches the database; responses are cacheable for 60 s.
const MAX_RESULTS = 8;

function toSuggestion(product: CatalogProduct): SearchSuggestion {
  return {
    id: product._id,
    name: product.displayName,
    descriptor: product.descriptor,
    image: product.image,
    displayPrice: product.sellPrice,
    mrp: product.sellMrp,
    packSize: product.minQty,
    stock: product.stock,
    brand: product.brand,
    categoryLabel: product.categoryLabel,
    href: product.href,
  };
}

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 80);

  if (!query) {
    return NextResponse.json({ query, total: 0, results: [] as SearchSuggestion[] });
  }

  try {
    // One listing per part: some drivers are listed under two categories.
    const matches = dedupeByDisplayName(searchProducts(await getAllProducts(), query));
    return NextResponse.json(
      { query, total: matches.length, results: matches.slice(0, MAX_RESULTS).map(toSuggestion) },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("search: catalogue unavailable", error);
    return NextResponse.json(
      { query, total: 0, results: [] as SearchSuggestion[], error: "Search is unavailable right now." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
