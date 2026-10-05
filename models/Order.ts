import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const TrackingEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    location: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Where the customer came from (UTM tags / Meta click id), captured on landing.
const MetaMatchSchema = new mongoose.Schema(
  {
    fbp: { type: String, default: "" },
    fbc: { type: String, default: "" },
    clientIp: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { _id: false }
);

const AttributionSchema = new mongoose.Schema(
  {
    utmSource: { type: String, default: "" },
    utmMedium: { type: String, default: "" },
    utmCampaign: { type: String, default: "" },
    utmContent: { type: String, default: "" },
    utmTerm: { type: String, default: "" },
    fbclid: { type: String, default: "" },
    landingPage: { type: String, default: "" },
    referrer: { type: String, default: "" },
    capturedAt: { type: Date, default: null },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    receipt: { type: String, required: true, unique: true },
    // CA/2026-27/000123 once paid or COD-confirmed; "PENDING-<receipt>" before
    // that (see lib/invoice-number.ts). Older orders keep INV-<timestamp>.
    invoiceNumber: { type: String, required: true, unique: true },
    // Account that placed the order (from the session), null for guest orders.
    // Deliberately no default: orders saved before this field existed don't
    // have it, and lib/order-access.ts treats those differently.
    userId: { type: String, index: true },
    // Session email of the account that placed the order; "" for guests.
    userEmail: { type: String, default: "", index: true },
    customerEmail: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    shippingAddress: { type: AddressSchema, required: true },
    billingAddress: { type: AddressSchema, required: true },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, required: true },
    taxableAmount: { type: Number, required: true },
    productTaxableAmount: { type: Number, default: 0 },
    // Courier charge without the COD fee (0 with free shipping). Orders saved
    // before codFee existed have the COD charge folded into shippingFee.
    shippingFee: { type: Number, required: true },
    codFee: { type: Number, default: 0 },
    // True when the live courier API was unavailable and the fallback table priced shipping.
    shippingEstimated: { type: Boolean, default: false },
    // GST on shippingFee + codFee.
    shippingTaxableAmount: { type: Number, default: 0 },
    taxRate: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    productTaxAmount: { type: Number, default: 0 },
    shippingTaxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    paymentMethod: {
      type: String,
      enum: ["prepaid", "cod"],
      default: "prepaid",
    },
    // "cod" = confirmed Cash on Delivery order, amount to be collected on delivery.
    status: {
      type: String,
      enum: ["created", "paid", "failed", "cod"],
      default: "created",
    },
    fulfillmentStatus: {
      type: String,
      enum: ["processing", "packed", "shipped", "out_for_delivery", "delivered", "completed", "cancelled"],
      default: "processing",
    },
    courierName: { type: String, default: "" },
    trackingNumber: { type: String, default: "" },
    estimatedDelivery: { type: Date, default: null },
    trackingTimeline: { type: [TrackingEventSchema], default: [] },
    // COD orders store "cod_<receipt>" here: the existing unique index treats
    // a missing value as a duplicate, so every order needs a distinct value.
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    // Which path confirmed the payment: verify-payment, webhook or reconcile.
    paymentSource: { type: String, default: "" },
    // Whether this order's items were taken out of stock.
    stockDeducted: { type: Boolean, default: false },
    // Set when an order needs a human, e.g. paid but out of stock.
    needsAttention: { type: Boolean, default: false },
    attentionReason: { type: String, default: "" },
    attribution: { type: AttributionSchema, default: null },
    // The customer's Meta matching details from their own checkout request, so a
    // server Purchase sent later (Razorpay webhook or redirect callback, which
    // carry no _fbp cookie) can still be matched. See lib/meta-capi.ts.
    metaMatch: { type: MetaMatchSchema, default: null },
    metaPurchaseSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

delete mongoose.models.Order;

export default mongoose.model("Order", OrderSchema);
