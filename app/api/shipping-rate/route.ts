import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import {
  estimateShipmentWeightKg,
  fetchShippingQuote,
  SHIPPING_PICKUP_PINCODE,
  ShippingQuoteError,
} from "@/lib/shipping-rates";
import { getDisplayPrice, roundCurrency } from "@/lib/order-utils";
import { isCodAllowed, COD_ENABLED, COD_MAX_ORDER_VALUE, COD_UNAVAILABLE_MESSAGE } from "@/lib/shipping-policy";
import { normalizePincode } from "@/lib/checkout-validation";

type IncomingCartItem = {
  quantity?: number;
  _id?: string;
  productId?: string;
};

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> & { shippingAddress?: { pincode?: unknown } };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const cartItems = Array.isArray(body?.cartItems) ? (body.cartItems as IncomingCartItem[]) : [];
    const deliveryPostcode = normalizePincode(
      String(body?.deliveryPostcode || body?.pincode || body?.shippingAddress?.pincode || "").replace(/\D/g, "")
    );
    const cod = Boolean(body?.cod);
    const selectedCourierCompanyId = Number(body?.selectedCourierCompanyId || 0) || undefined;

    if (!deliveryPostcode) {
      return NextResponse.json(
        { error: "A valid 6-digit delivery pincode is required" },
        { status: 400 }
      );
    }

    const normalizedItems = cartItems
      .map((item) => ({
        productId: String(item?.productId || item?._id || "").trim(),
        quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
      }))
      .filter((item) => mongoose.isValidObjectId(item.productId));

    await dbConnect();
    const products = await Product.find({
      _id: { $in: normalizedItems.map((item) => item.productId) },
    })
      .select("_id name category weightGrams price flashSale discountPercentage")
      .lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    const pricedItems = normalizedItems.filter((item) => productMap.has(item.productId));

    if (!pricedItems.length) {
      return NextResponse.json({ error: "Add a product to see delivery charges" }, { status: 400 });
    }

    // Price the cart from the database, never from the client, so free
    // shipping and the COD limit can't be unlocked by editing the request.
    const subtotal = roundCurrency(
      pricedItems.reduce((sum, item) => {
        const product = productMap.get(item.productId)!;
        const hasFlashSale =
          Boolean(product.flashSale) && Number(product.discountPercentage || 0) > 0;
        const { inclusiveFinalPrice } = getDisplayPrice(
          Number(product.price) || 0,
          Number(product.discountPercentage || 0),
          hasFlashSale
        );
        return sum + inclusiveFinalPrice * item.quantity;
      }, 0)
    );

    if (cod && !COD_ENABLED) {
      return NextResponse.json({ error: COD_UNAVAILABLE_MESSAGE }, { status: 400 });
    }
    if (cod && !isCodAllowed(subtotal)) {
      return NextResponse.json(
        { error: `Cash on Delivery is available on orders up to Rs ${COD_MAX_ORDER_VALUE}` },
        { status: 400 }
      );
    }

    const weightKg = estimateShipmentWeightKg(
      pricedItems.map((item) => {
        const product = productMap.get(item.productId);
        return {
          quantity: item.quantity,
          weightGrams: product?.weightGrams,
          category: product?.category,
          name: product?.name,
        };
      })
    );
    const quote = await fetchShippingQuote({
      pickupPostcode: SHIPPING_PICKUP_PINCODE,
      deliveryPostcode,
      weightKg,
      cod,
      subtotal,
    }, selectedCourierCompanyId);

    return NextResponse.json(quote);
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[shipping-rate] Failed:", error);
    return NextResponse.json(
      { error: "Unable to fetch courier rates right now. Please try again." },
      { status: 500 }
    );
  }
}
