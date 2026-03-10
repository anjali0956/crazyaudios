import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    image: String,
    description: String,
    stock: Number,
    category: String,
    specifications: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
