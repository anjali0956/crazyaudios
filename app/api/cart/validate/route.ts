import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { displayName } from "@/lib/display";
import { pricingOf } from "@/lib/format";

// Read-only check of a cart against the live catalogue. The cart page and the
// checkout call it on load, then refresh prices and stock in the browser cart
// and tell the customer what changed. Nothing is written here; create-order
// re-checks everything on the server anyway.

export const dynamic = "force-dynamic";

const MAX_ITEMS = 50;

type LeanProduct = {
  _id: unknown;
  name?: string;
  price?: number;
  image?: string;
  stock?: number;
  packSize?: number | null;
  flashSale?: boolean;
  discountPercentage?: number;
  category?: string;
};

export type ValidatedCartProduct =
  | { productId: string; found: false }
  | {
      productId: string;
      found: true;
      /** Raw catalogue name (what the cart stores and Meta receives). */
      name: string;
      /** Customer-facing name. */
      displayName: string;
      image: string;
      category: string;
      /** Stored price, GST incl., before any flash sale (what the cart store's reconcile() expects). */
      price: number;
      flashSale: boolean;
      discountPercentage: number;
      /** What one unit costs the customer now (GST incl., sale applied). */
      displayPrice: number;
      /** Struck unit price while a flash sale runs, otherwise null. */
      mrp: number | null;
      stock: number;
      packSize: number | null;
      /** Quantity the client asked about, and whether it can be sold as is. */
      quantity: number;
      available: boolean;
    };

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid request" });
  }

  const rawItems = (body as { items?: unknown } | null)?.items;
  if (!Array.isArray(rawItems)) return json(400, { error: "items must be an array" });
  if (rawItems.length > MAX_ITEMS) return json(400, { error: `A cart can hold at most ${MAX_ITEMS} products` });

  const requested = new Map<string, number>();
  for (const entry of rawItems) {
    const item = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const id = String(item.productId ?? item._id ?? "").trim();
    if (!id || requested.has(id)) continue;
    requested.set(id, Math.max(1, Math.floor(Number(item.quantity) || 1)));
  }

  const validIds = [...requested.keys()].filter((id) => mongoose.isValidObjectId(id));
  let docs: LeanProduct[] = [];
  if (validIds.length) {
    try {
      await dbConnect();
      docs = await Product.find({ _id: { $in: validIds } })
        .select("name price image stock packSize flashSale discountPercentage category")
        .lean<LeanProduct[]>();
    } catch (error) {
      console.error("[cart/validate] Product lookup failed:", error);
      return json(503, { error: "We couldn't check your cart right now." });
    }
  }

  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  const products: ValidatedCartProduct[] = [...requested.entries()].map(([productId, quantity]) => {
    const doc = byId.get(productId);
    if (!doc) return { productId, found: false };

    const pricing = pricingOf({
      price: Number(doc.price) || 0,
      packSize: doc.packSize,
      flashSale: doc.flashSale,
      discountPercentage: doc.discountPercentage,
    });
    const stock = Math.max(0, Math.floor(Number(doc.stock) || 0));
    const sellable = Math.floor(stock / pricing.packSize) * pricing.packSize;
    const name = String(doc.name ?? "");

    return {
      productId,
      found: true,
      name,
      displayName: displayName(name),
      image: String(doc.image ?? ""),
      category: String(doc.category ?? ""),
      price: Number(doc.price) || 0,
      flashSale: Boolean(doc.flashSale),
      discountPercentage: Number(doc.discountPercentage) || 0,
      displayPrice: pricing.unitPrice,
      mrp: pricing.unitMrp,
      stock,
      packSize: doc.packSize ? Math.max(1, Math.floor(Number(doc.packSize))) : null,
      quantity,
      available: sellable >= Math.max(pricing.packSize, quantity),
    };
  });

  return json(200, { products });
}
