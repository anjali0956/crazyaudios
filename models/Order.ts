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

const OrderSchema = new mongoose.Schema(
  {
    receipt: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, required: true, unique: true },
    userEmail: { type: String, default: "", index: true },
    customerEmail: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    shippingAddress: { type: AddressSchema, required: true },
    billingAddress: { type: AddressSchema, required: true },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true },
    taxRate: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
    fulfillmentStatus: {
      type: String,
      enum: ["processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"],
      default: "processing",
    },
    courierName: { type: String, default: "" },
    trackingNumber: { type: String, default: "" },
    estimatedDelivery: { type: Date, default: null },
    trackingTimeline: { type: [TrackingEventSchema], default: [] },
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
