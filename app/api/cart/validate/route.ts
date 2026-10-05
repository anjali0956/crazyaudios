import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getDisplayPrice, roundCurrency } from "@/lib/order-utils";

// Read-only check of a cart against the live catalogue (ported from the
// redesign). The cart page calls it on load and refreshes stale prices and
// stock in the browser cart. Nothing is written here, and only what the
// storefront already shows comes back: price, flash sale, stock and pack size.
// create-order re-checks everything when the order is placed.

export const dynamic = "force-dynamic";

const MAX_ITEMS = 50;

type LeanProduct = {
  _id: unknown;
  price?: number;
  stock?: number;
  packSize?: number | null;
  flashSale?: boolean;
  discountPercentage?: number;
};

type CheckedProduct =
  | { productId: string; found: false }
  | {
      productId: string;
      found: true;
      flashSale: boolean;
      discountPercentage: number;
      /** What one unit costs now, GST incl., sale applied: what create-order charges. */
      unitPrice: number;
      /** Unit price before the flash sale (the cart's originalPrice). */
      originalUnitPrice: number;
      stock: number;
      packSize: number | null;
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

  const rawItems = (body && typeof body === "object" ? (body as { items?: unknown }).items : undefined);
  if (!Array.isArray(rawItems)) return json(400, { error: "items must be an array" });
  if (rawItems.length > MAX_ITEMS) return json(400, { error: `A cart can hold at most ${MAX_ITEMS} products` });

  const ids: string[] = [];
  for (const entry of rawItems) {
    const item = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const id = item.productId ?? item._id;
    if (typeof id !== "string" || !id.trim() || ids.includes(id.trim())) continue;
    ids.push(id.trim());
  }

  const validIds = ids.filter((id) => mongoose.isValidObjectId(id));
  let docs: LeanProduct[] = [];
  if (validIds.length) {
    try {
      await dbConnect();
      docs = await Product.find({ _id: { $in: validIds } })
        .select("price stock packSize flashSale discountPercentage")
        .lean<LeanProduct[]>();
    } catch (error) {
      console.error("[cart/validate] Product lookup failed:", error);
      return json(503, { error: "We couldn't check your cart right now." });
    }
  }

  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  const products: CheckedProduct[] = ids.map((productId) => {
    const doc = byId.get(productId);
    if (!doc) return { productId, found: false };

    // Same pricing as create-order.
    const price = roundCurrency(Number(doc.price) || 0);
    const discountPercentage = Number(doc.discountPercentage) || 0;
    const { inclusiveFinalPrice, inclusiveBasePrice } = getDisplayPrice(
      price,
      discountPercentage,
      Boolean(doc.flashSale) && discountPercentage > 0
    );
    const packSize = Math.floor(Number(doc.packSize) || 0);

    return {
      productId,
      found: true,
      flashSale: Boolean(doc.flashSale),
      discountPercentage,
      unitPrice: inclusiveFinalPrice,
      originalUnitPrice: inclusiveBasePrice,
      stock: Math.max(0, Math.floor(Number(doc.stock) || 0)),
      packSize: packSize > 0 ? packSize : null,
    };
  });

  return json(200, { products });
}
