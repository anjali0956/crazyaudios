"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Image from "next/image";

export default function ProductDetails() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    axios.get(`/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
      })
      .catch((err) => {
        console.error("Error fetching product:", err);
      });
  }, [id]);

  const addToCart = () => {
    const existingCart = JSON.parse(localStorage.getItem("cart") || "[]");

    const existingItem = existingCart.find(
      (item: any) => item._id === product._id
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      existingCart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(existingCart));
    alert("Added to cart!");
  };

  if (!product) return <p className="p-10">Loading...</p>;

  return (
    <main className="min-h-screen bg-gray-100 p-10 text-black">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-8 grid grid-cols-2 gap-10">
        
        {/* Image */}
        <div className="relative w-full h-96">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain rounded-lg"
          />
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold mb-4 text-black">
            {product.name}
          </h1>

          <p className="text-2xl mb-4 text-black">
            ₹{product.price}
          </p>

          <p className="mb-6 text-black">
            {product.description}
          </p>

          {/* ✅ Add to Cart Button */}
          <button
            onClick={addToCart}
            className="mb-6 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
          >
            Add to Cart
          </button>

          {/* Specifications */}
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-3 text-black">
              Specifications
            </h3>

            {product.specifications &&
              Object.entries(product.specifications).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between border-b py-2 text-black"
                  >
                    <span className="capitalize font-medium">
                      {key}
                    </span>
                    <span>{value as string}</span>
                  </div>
                )
              )}
          </div>
        </div>

      </div>
    </main>
  );
}