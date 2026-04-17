"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import ProductImageWithEmblem from "@/app/components/ProductImageWithEmblem";

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string;
  description?: string[];
  flashSale?: boolean;
  discountPercentage?: number;
  stock?: number;
};

export default function ProductDetails() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) return;

    axios
      .get(`/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
      })
      .catch((err) => {
        console.error("Error fetching product:", err);
      });
  }, [id]);

  const finalPrice = useMemo(() => {
    if (!product) return 0;
    if (!product.flashSale || (product.discountPercentage || 0) <= 0) return product.price;
    return Math.round(product.price * (1 - (product.discountPercentage || 0) / 100));
  }, [product]);

  const addToCart = () => {
    if (!product) return;
    const existingCart = JSON.parse(localStorage.getItem("cart") || "[]");

    const existingItem = existingCart.find((item: any) => item._id === product._id);

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.price = finalPrice;
      existingItem.originalPrice = product.price;
      existingItem.flashSale = Boolean(product.flashSale);
      existingItem.discountPercentage = product.discountPercentage || 0;
    } else {
      existingCart.push({
        ...product,
        price: finalPrice,
        originalPrice: product.price,
        flashSale: Boolean(product.flashSale),
        discountPercentage: product.discountPercentage || 0,
        quantity,
      });
    }

    localStorage.setItem("cart", JSON.stringify(existingCart));
    alert("Added to cart!");
  };

  if (!product) return <p className="p-4 sm:p-6 lg:p-10">Loading...</p>;

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-black sm:p-6 lg:p-10">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-4 grid grid-cols-1 gap-6 sm:p-6 md:grid-cols-2 lg:gap-10 lg:p-8">
        <div className="relative w-full h-72 sm:h-96">
          <ProductImageWithEmblem
            src={product.image}
            alt={product.name}
            emblemSize={102}
            className="object-contain rounded-lg"
            emblemClassName="top-3 right-3"
          />
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-4 text-black sm:text-3xl">{product.name}</h1>

          <div className="mb-4">
            {product.stock !== undefined && product.stock === 0 ? (
              <span className="text-xl font-bold text-red-600">Out of stock</span>
            ) : product.stock !== undefined && product.stock <= 5 ? (
              <span className="text-xl font-bold text-orange-500 animate-pulse">Quick! Few left</span>
            ) : (
              <span className="text-lg font-semibold text-green-600">In stock</span>
            )}
          </div>

          {product.flashSale && (product.discountPercentage || 0) > 0 && (
            <span className="inline-block mb-2 text-sm font-semibold bg-red-100 text-red-600 px-3 py-1 rounded">
              Flash Sale {product.discountPercentage}% OFF
            </span>
          )}

          {product.flashSale && (product.discountPercentage || 0) > 0 ? (
            <div className="mb-4 flex items-center gap-3">
              <p className="text-2xl font-bold text-red-600 sm:text-3xl">Rs {finalPrice}</p>
              <p className="text-lg text-gray-500 line-through sm:text-xl">Rs {product.price}</p>
            </div>
          ) : (
            <p className="text-xl mb-4 text-black sm:text-2xl">Rs {product.price}</p>
          )}

          <ul className="list-disc pl-5 text-black mb-6 space-y-2">
            {product.description?.map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>

          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              className="min-h-11 px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              disabled={quantity === 1}
            >
              -
            </button>

            <span className="text-lg font-semibold">{quantity}</span>

            <button
              onClick={() => setQuantity((prev) => prev + 1)}
              className="min-h-11 px-4 py-2 bg-gray-300 rounded"
            >
              +
            </button>
          </div>

          <button
            onClick={addToCart}
            className="mb-6 w-full bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition sm:w-auto"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </main>
  );
}
