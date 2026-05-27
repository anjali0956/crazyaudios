import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Razorpay from "razorpay";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  buildInvoiceNumber,
  buildReceipt,
  calculateTotals,
  normalizeCartItems,
  roundCurrency,
  validateAddress,
} from "@/lib/order-utils";
import { estimateShipmentWeightKg, fetchShippingQuote, SHIPPING_PICKUP_PINCODE } from "@/lib/shipping-rates";
import Product from "@/models/Product";

type IncomingCartItem = {
  _id?: string;
  productId?: string;
  quantity?: number;
};

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function getPublicRazorpayKey() {
  const keyId = process.env.RAZORPAY_KEY_ID;

  if (!keyId) {
    throw new Error("Razorpay key ID is not configured");
  }

  return keyId;
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    const body = await req.json();
    const cartItems = Array.isArray(body?.cartItems) ? (body.cartItems as IncomingCartItem[]) : [];
    const shippingAddress = body?.shippingAddress;
    const billingAddress = body?.billingAddress;
    const selectedCourierCompanyId = Number(body?.selectedCourierCompanyId || 0) || undefined;

    if (!cartItems.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const shippingError = validateAddress(shippingAddress);
    if (shippingError) {
      return NextResponse.json({ error: `Shipping ${shippingError}` }, { status: 400 });
    }

    const billingError = validateAddress(billingAddress);
    if (billingError) {
      return NextResponse.json({ error: `Billing ${billingError}` }, { status: 400 });
    }

    const normalizedItems = normalizeCartItems(cartItems);
    const products = await Product.find({
      _id: { $in: normalizedItems.map((item) => item.productId) },
    }).lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const missingProduct = normalizedItems.find((item) => !productMap.has(item.productId));
    if (missingProduct) {
      return NextResponse.json({ error: "One or more products are unavailable" }, { status: 400 });
    }

    const items = normalizedItems.map((item) => {
      const product = productMap.get(item.productId)!;

      if (product.stock < item.quantity) {
        throw new Error(`Only ${product.stock} units left for ${product.name}`);
      }

      const basePrice = roundCurrency(Number(product.price));
      const hasFlashSale =
        Boolean(product.flashSale) && Number(product.discountPercentage || 0) > 0;
      const unitPrice = hasFlashSale
        ? roundCurrency(
            basePrice * (1 - Math.min(95, Math.max(0, Number(product.discountPercentage || 0))) / 100)
          )
        : basePrice;
      const lineTotal = roundCurrency(unitPrice * item.quantity);

      return {
        productId: product._id,
        name: product.name,
        image: product.image,
        weightGrams:
          product.weightGrams === null || product.weightGrams === undefined
            ? null
            : Number(product.weightGrams),
        unitPrice,
        originalUnitPrice: basePrice,
        flashSale: hasFlashSale,
        discountPercentage: hasFlashSale ? Number(product.discountPercentage || 0) : 0,
        quantity: item.quantity,
        lineTotal,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const estimatedWeightKg = estimateShipmentWeightKg(
      normalizedItems.map((item) => ({
        quantity: item.quantity,
        weightGrams: productMap.get(item.productId)?.weightGrams,
      }))
    );
    const shippingQuote = await fetchShippingQuote({
      pickupPostcode: SHIPPING_PICKUP_PINCODE,
      deliveryPostcode: String(shippingAddress.pincode || "").trim(),
      weightKg: estimatedWeightKg,
      cod: false,
    }, selectedCourierCompanyId);
    const totals = calculateTotals(
      subtotal,
      shippingAddress,
      shippingQuote.shippingFee,
      shippingQuote.shippingLabel
    );

    const amountInPaise = Math.round(totals.totalAmount * 100);

    if (amountInPaise < 100) {
      return NextResponse.json(
        { error: "Order amount must be at least 100 paise" },
        { status: 400 }
      );
    }

    const razorpay = getRazorpayClient();
    const receipt = buildReceipt();
    const invoiceNumber = buildInvoiceNumber();

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
    });

    const savedOrder = await Order.create({
      receipt,
      invoiceNumber,
      userEmail: session?.user?.email || shippingAddress.email,
      customerEmail: shippingAddress.email,
      customerName: shippingAddress.name,
      customerPhone: shippingAddress.phone,
      shippingAddress,
      billingAddress,
      items,
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      currency: "INR",
      status: "created",
      courierName: shippingQuote.courierName,
      estimatedDelivery: shippingQuote.estimatedDeliveryDate,
      razorpayOrderId: razorpayOrder.id,
    });

    return NextResponse.json({
      internal_order_id: String(savedOrder._id),
      key_id: getPublicRazorpayKey(),
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      totals,
      shippingQuote,
    });
  } catch (error: any) {
    const message = error?.error?.description || error?.message || "Failed to create Razorpay order";
    const status = /auth|key|credential/i.test(message) ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
