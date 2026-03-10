"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    axios.get("/api/products").then((res) => {
      setProducts(res.data);
    });
  }, []);

  // 🔹 Filter Logic
  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter(
          (product) =>
            product.category &&
            product.category.toLowerCase().trim() ===
              selectedCategory.toLowerCase().trim()
        );

  return (
    <main className="min-h-screen bg-gray-100 text-black">

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-pink-500 text-white text-center py-20">
        <h2 className="text-4xl font-bold mb-4">
          Feel the Sound. Go Crazy.
        </h2>
        <p className="text-lg mb-6">
          Premium Audio Products at the Best Prices.
        </p>
        <button className="bg-black px-6 py-3 rounded-lg hover:bg-gray-800">
          Shop Now
        </button>
      </section>

      {/* Products Section */}
      <section className="p-10">
        <h2 className="text-3xl font-bold mb-8 text-center">
          Featured Products
        </h2>

        {/* 🔹 Dynamic Category Buttons */}
        <div className="flex justify-center gap-4 mb-10 flex-wrap">

          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded ${
              selectedCategory === "all"
                ? "bg-black text-white"
                : "bg-gray-300"
            }`}
          >
            All
          </button>

          {[...new Set(products.map((p) => p.category))]
            .filter(Boolean)
            .map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded ${
                  selectedCategory === cat
                    ? "bg-black text-white"
                    : "bg-gray-300"
                }`}
              >
                {cat}
              </button>
            ))}
        </div>

        {/* 🔹 Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <Link href={`/product/${String(product._id)}`} key={String(product._id)} className="block" >
              <div className="bg-white rounded-xl shadow p-5 hover:shadow-lg transition cursor-pointer">
                
                <div className="relative w-full h-64">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>

                <h3 className="mt-4 text-xl font-semibold">
                  {product.name}
                </h3>

                <p className="text-gray-600 mt-2">
                  ₹{product.price}
                </p>

                <button
                  onClick={(e) => {
                    e.preventDefault();

                    const existingCart = JSON.parse(
                      localStorage.getItem("cart") || "[]"
                    );

                    const existingItem = existingCart.find(
                      (item: any) => item._id === product._id
                    );

                    if (existingItem) {
                      existingItem.quantity += 1;
                    } else {
                      existingCart.push({ ...product, quantity: 1 });
                    }

                    localStorage.setItem(
                      "cart",
                      JSON.stringify(existingCart)
                    );

                    alert("Added to cart!");
                  }}
                  className="mt-4 w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800"
                >
                  Add to Cart
                </button>

              </div>
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}