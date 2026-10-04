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
  getDisplayPrice,
  normalizeCartItems,
  roundCurrency,
  validateAddress,
} from "@/lib/order-utils";
import { estimateShipmentWeightKg, fetchShippingQuote, SHIPPING_PICKUP_PINCODE } from "@/lib/shipping-rates";
import { COD_MAX_ORDER_VALUE, isCodAllowed, normalizePaymentMethod } from "@/lib/shipping-policy";
import { sanitizeAttribution } from "@/lib/attribution";
import { sendMetaPurchaseEvent } from "@/lib/meta-capi";
import Product from "@/models/Product";

type IncomingCartItem = {
  _id?: string;
  productId?: string;
  quantity?: number;
};

type StockItem = {
  productId: unknown;
  name: string;
  quantity: number;
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

async function releaseStock(items: StockItem[]) {
  for (const item of items) {
    await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } });
  }
}

// COD orders are confirmed immediately, so stock is taken now (prepaid orders
// take it in verify-payment). All-or-nothing: a shortfall returns what was taken.
async function reserveStock(items: StockItem[]) {
  const reserved: StockItem[] = [];

  for (const item of items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { new: true }
    );

    if (!updated) {
      await releaseStock(reserved);
      return `Insufficient stock for ${item.name}`;
    }

    reserved.push(item);
  }

  return null;
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
    const paymentMethod = normalizePaymentMethod(body?.paymentMethod);
    const attribution = sanitizeAttribution(body?.attribution);

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
      const { inclusiveFinalPrice, inclusiveBasePrice } = getDisplayPrice(
        basePrice,
        Number(product.discountPercentage || 0),
        hasFlashSale
      );
      const unitPrice = inclusiveFinalPrice;
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
        originalUnitPrice: inclusiveBasePrice,
        flashSale: hasFlashSale,
        discountPercentage: hasFlashSale ? Number(product.discountPercentage || 0) : 0,
        quantity: item.quantity,
        lineTotal,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

    if (paymentMethod === "cod" && !isCodAllowed(subtotal)) {
      return NextResponse.json(
        { error: `Cash on Delivery is available on orders up to Rs ${COD_MAX_ORDER_VALUE}` },
        { status: 400 }
      );
    }

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
      cod: paymentMethod === "cod",
      subtotal,
    }, selectedCourierCompanyId);
    const totals = calculateTotals(
      subtotal,
      shippingAddress,
      shippingQuote.shippingFee,
      shippingQuote.shippingLabel
    );

    const amountInPaise = Math.round(totals.totalAmount * 100);
    const receipt = buildReceipt();
    const invoiceNumber = buildInvoiceNumber();

    if (amountInPaise < 100) {
      return NextResponse.json(
        { error: "Order amount must be at least 100 paise" },
        { status: 400 }
      );
    }

    const orderFields = {
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
      taxableAmount: totals.taxableAmount,
      productTaxableAmount: totals.productTaxableAmount,
      shippingFee: totals.shippingFee,
      shippingTaxableAmount: totals.shippingTaxableAmount,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      productTaxAmount: totals.productTaxAmount,
      shippingTaxAmount: totals.shippingTaxAmount,
      totalAmount: totals.totalAmount,
      currency: "INR",
      courierName: shippingQuote.courierName,
      estimatedDelivery: shippingQuote.estimatedDeliveryDate,
      attribution,
    };

    if (paymentMethod === "cod") {
      const stockError = await reserveStock(items);
      if (stockError) {
        return NextResponse.json({ error: stockError }, { status: 409 });
      }

      let codOrder;
      try {
        codOrder = await Order.create({
          ...orderFields,
          paymentMethod: "cod",
          status: "cod",
          razorpayOrderId: `cod_${receipt}`,
          trackingTimeline: [
            {
              status: "processing",
              title: "Order Confirmed",
              description: "Cash on Delivery order confirmed. We are preparing your shipment.",
              location: "CrazyAudios Warehouse",
              createdAt: new Date(),
            },
          ],
        });
      } catch (createError) {
        await releaseStock(items);
        throw createError;
      }

      if (await sendMetaPurchaseEvent(codOrder, req)) {
        await Order.updateOne({ _id: codOrder._id }, { metaPurchaseSentAt: new Date() });
      }

      return NextResponse.json({
        success: true,
        paymentMethod: "cod",
        orderId: String(codOrder._id),
        receipt: codOrder.receipt,
        invoiceNumber: codOrder.invoiceNumber,
        totals,
        shippingQuote,
      });
    }

    const razorpay = getRazorpayClient();

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
    });

    const savedOrder = await Order.create({
      ...orderFields,
      paymentMethod: "prepaid",
      status: "created",
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
    const status = /auth|key|credential/i.test(message)
      ? 401
      : /shipping weight is not configured|Cash on Delivery is not available/i.test(message)
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
