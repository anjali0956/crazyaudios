import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import {
  estimateShipmentWeightKg,
  fetchShippingQuote,
  SHIPPING_PICKUP_PINCODE,
} from "@/lib/shipping-rates";

type IncomingCartItem = {
  quantity?: number;
  _id?: string;
  productId?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cartItems = Array.isArray(body?.cartItems) ? (body.cartItems as IncomingCartItem[]) : [];
    const deliveryPostcode = String(
      body?.deliveryPostcode || body?.pincode || body?.shippingAddress?.pincode || ""
    )
      .trim()
      .replace(/\D/g, "");
    const cod = Boolean(body?.cod);
    const selectedCourierCompanyId = Number(body?.selectedCourierCompanyId || 0) || undefined;

    if (deliveryPostcode.length !== 6) {
      return NextResponse.json(
        { error: "A valid 6-digit delivery pincode is required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const normalizedItems = cartItems.map((item) => ({
      productId: String(item?.productId || item?._id || "").trim(),
      quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
    }));
    const products = await Product.find({
      _id: { $in: normalizedItems.map((item) => item.productId).filter(Boolean) },
    })
      .select("_id weightGrams")
      .lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const weightKg = estimateShipmentWeightKg(
      normalizedItems.map((item) => ({
        quantity: item.quantity,
        weightGrams: productMap.get(item.productId)?.weightGrams,
      }))
    );
    const quote = await fetchShippingQuote({
      pickupPostcode: SHIPPING_PICKUP_PINCODE,
      deliveryPostcode,
      weightKg,
      cod,
    }, selectedCourierCompanyId);

    return NextResponse.json(quote);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch shipping rate" },
      { status: 500 }
    );
  }
}
