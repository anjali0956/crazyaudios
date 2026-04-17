import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },

    // ✅ FIXED PROPERLY
    description: {
      type: [String],
      default: [],
    },

    stock: { type: Number, required: true },
    category: { type: String, required: true },
    featured: { type: Boolean, default: false },
    flashSale: { type: Boolean, default: false },
    discountPercentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ✅ VERY IMPORTANT FIX (prevents old schema caching)
delete mongoose.models.Product;

export default mongoose.model("Product", ProductSchema);
