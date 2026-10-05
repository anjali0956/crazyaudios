import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  buildReceipt,
  calculateTotals,
  getDisplayPrice,
  normalizeCartItems,
  roundCurrency,
} from "@/lib/order-utils";
import {
  estimateShipmentWeightKg,
  fetchShippingQuote,
  SHIPPING_PICKUP_PINCODE,
  ShippingQuoteError,
} from "@/lib/shipping-rates";
import {
  COD_ENABLED,
  COD_MAX_ORDER_VALUE,
  COD_UNAVAILABLE_MESSAGE,
  isCodAllowed,
  normalizePaymentMethod,
} from "@/lib/shipping-policy";
import { sanitizeAttribution } from "@/lib/attribution";
import { validateCheckoutAddresses } from "@/lib/checkout-validation";
import { normalizeEmail } from "@/lib/email";
import { assignInvoiceNumber, pendingInvoiceNumber } from "@/lib/invoice-number";
import { getPublicRazorpayKey, getRazorpayClient } from "@/lib/razorpay";
import { consumeRateLimits, getRequestIp } from "@/lib/rate-limit";
import { returnStock, takeStock } from "@/lib/stock";
import { sendPurchaseEventOnce } from "@/lib/payments";
import { metaMatchFromRequest } from "@/lib/meta-capi";

type IncomingCartItem = {
  _id?: string;
  productId?: string;
  quantity?: number;
};

const HOUR_MS = 60 * 60 * 1000;
// Per server instance (in-memory), see lib/rate-limit.ts.
const MAX_ORDERS_PER_PHONE_PER_HOUR = 5;
const MAX_ORDERS_PER_IP_PER_HOUR = 20;

function errorResponse(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, "Invalid request");
    }

    const cartItems = Array.isArray(body?.cartItems) ? (body.cartItems as IncomingCartItem[]) : [];
    const selectedCourierCompanyId = Number(body?.selectedCourierCompanyId || 0) || undefined;
    const paymentMethod = normalizePaymentMethod(body?.paymentMethod);
    const attribution = sanitizeAttribution(body?.attribution);

    if (!cartItems.length) {
      return errorResponse(400, "Your cart is empty");
    }

    const addresses = validateCheckoutAddresses(body?.shippingAddress, body?.billingAddress);
    if (!addresses.ok) {
      return errorResponse(400, addresses.error, { fieldErrors: addresses.fieldErrors });
    }
    const { shipping: shippingAddress, billing: billingAddress } = addresses;

    const normalizedItems = normalizeCartItems(cartItems);
    if (normalizedItems.some((item) => !mongoose.isValidObjectId(item.productId))) {
      return errorResponse(400, "One or more products in your cart are no longer available");
    }

    await dbConnect();
    const session = await getServerSession(authOptions);

    const products = await Product.find({
      _id: { $in: normalizedItems.map((item) => item.productId) },
    }).lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    if (normalizedItems.some((item) => !productMap.has(item.productId))) {
      return errorResponse(400, "One or more products in your cart are no longer available");
    }

    const shortItem = normalizedItems.find(
      (item) => Number(productMap.get(item.productId)!.stock) < item.quantity
    );
    if (shortItem) {
      const product = productMap.get(shortItem.productId)!;
      const left = Math.max(0, Number(product.stock) || 0);
      return errorResponse(
        409,
        left > 0 ? `Only ${left} left of ${product.name}` : `${product.name} is out of stock`
      );
    }

    const items = normalizedItems.map((item) => {
      const product = productMap.get(item.productId)!;
      const basePrice = roundCurrency(Number(product.price));
      const hasFlashSale =
        Boolean(product.flashSale) && Number(product.discountPercentage || 0) > 0;
      const { inclusiveFinalPrice, inclusiveBasePrice } = getDisplayPrice(
        basePrice,
        Number(product.discountPercentage || 0),
        hasFlashSale
      );
      const unitPrice = inclusiveFinalPrice;

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
        lineTotal: roundCurrency(unitPrice * item.quantity),
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

    if (paymentMethod === "cod" && !COD_ENABLED) {
      return errorResponse(400, COD_UNAVAILABLE_MESSAGE);
    }
    if (paymentMethod === "cod" && !isCodAllowed(subtotal)) {
      return errorResponse(400, `Cash on Delivery is available on orders up to Rs ${COD_MAX_ORDER_VALUE}`);
    }

    // COD is where fake orders cost money, so it gets the per-phone limit too.
    // Without a client IP header every visitor would share one bucket, so the
    // IP limit is skipped rather than turned into a store-wide cap.
    const ip = getRequestIp(req.headers);
    const limit = consumeRateLimits([
      ...(ip !== "unknown"
        ? [{ key: `order-ip:${ip}`, limit: MAX_ORDERS_PER_IP_PER_HOUR, windowMs: HOUR_MS }]
        : []),
      ...(paymentMethod === "cod"
        ? [{ key: `cod-phone:${shippingAddress.phone}`, limit: MAX_ORDERS_PER_PHONE_PER_HOUR, windowMs: HOUR_MS }]
        : []),
    ]);
    if (!limit.allowed) {
      console.warn(`[create-order] Rate limit hit for ${limit.key}`);
      return NextResponse.json(
        {
          error:
            "You've placed several orders in a short time. Please wait a while and try again, or message us on WhatsApp and we'll help.",
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const estimatedWeightKg = estimateShipmentWeightKg(
      normalizedItems.map((item) => {
        const product = productMap.get(item.productId);
        return {
          quantity: item.quantity,
          weightGrams: product?.weightGrams,
          category: product?.category,
          name: product?.name,
        };
      })
    );
    const shippingQuote = await fetchShippingQuote(
      {
        pickupPostcode: SHIPPING_PICKUP_PINCODE,
        deliveryPostcode: shippingAddress.pincode,
        weightKg: estimatedWeightKg,
        cod: paymentMethod === "cod",
        subtotal,
      },
      selectedCourierCompanyId
    );
    // The customer pays exactly products + shippingFee + codFee.
    const totals = calculateTotals(
      subtotal,
      shippingAddress,
      shippingQuote.shippingFee,
      shippingQuote.shippingLabel,
      shippingQuote.codFee
    );

    const amountInPaise = Math.round(totals.totalAmount * 100);
    if (amountInPaise < 100) {
      return errorResponse(400, "Order amount must be at least Rs 1");
    }

    const orderId = new mongoose.Types.ObjectId();
    const receipt = buildReceipt();
    const sessionUserId = session?.user?.id ? String(session.user.id) : null;

    const orderFields = {
      _id: orderId,
      receipt,
      // The real number is given when the order is confirmed (see lib/invoice-number.ts).
      invoiceNumber: pendingInvoiceNumber(receipt),
      // Ownership comes from the session only; guests get signed links instead.
      userId: sessionUserId,
      userEmail: sessionUserId ? normalizeEmail(session?.user?.email) : "",
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
      codFee: totals.codFee,
      shippingEstimated: shippingQuote.estimated,
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
      // For the server Purchase event when it is sent from a later request.
      metaMatch: metaMatchFromRequest(req),
    };

    if (paymentMethod === "cod") {
      // COD orders are confirmed immediately, so stock is taken now (prepaid
      // orders take it when the payment is confirmed). All or nothing.
      const stock = await takeStock(items);
      if (!stock.ok) {
        return errorResponse(409, `${stock.shortItem} just went out of stock. Please update your cart.`);
      }

      let codOrder;
      try {
        codOrder = await Order.create({
          ...orderFields,
          paymentMethod: "cod",
          status: "cod",
          razorpayOrderId: `cod_${receipt}`,
          stockDeducted: true,
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
        await returnStock(items);
        throw createError;
      }

      let invoiceNumber = codOrder.invoiceNumber;
      try {
        invoiceNumber = (await assignInvoiceNumber(codOrder._id)) || invoiceNumber;
      } catch (invoiceError) {
        // The invoice route assigns it later; the order itself is fine.
        console.error(`[create-order] Invoice number for COD order ${String(codOrder._id)} failed:`, invoiceError);
      }

      // Reported to Meta exactly once (metaPurchaseSentAt is claimed atomically).
      await sendPurchaseEventOnce(codOrder, req);

      return NextResponse.json({
        success: true,
        paymentMethod: "cod",
        orderId: String(codOrder._id),
        receipt: codOrder.receipt,
        invoiceNumber,
        totals,
        shippingQuote,
      });
    }

    let razorpayOrder;
    try {
      const razorpay = getRazorpayClient();
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt,
        // Lets the webhook cross-check which order a payment belongs to.
        notes: { internal_order_id: String(orderId), receipt },
      });
    } catch (razorpayError) {
      console.error("[create-order] Razorpay order could not be created:", razorpayError);
      return errorResponse(
        502,
        COD_ENABLED
          ? "Online payment is not available right now. Please try again in a minute, or choose Cash on Delivery."
          : "Online payment is not available right now. Please try again in a minute, or message us on WhatsApp."
      );
    }

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
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      return errorResponse(400, error.message);
    }
    console.error("[create-order] Failed:", error);
    return errorResponse(500, "We couldn't place your order right now. Please try again in a minute.");
  }
}
