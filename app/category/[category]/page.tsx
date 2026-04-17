"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCategory } from "@/app/components/CategoryContext";
import ProductImageWithEmblem from "@/app/components/ProductImageWithEmblem";

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  flashSale?: boolean;
  discountPercentage?: number;
  stock?: number;
};

function formatCategoryName(category: string) {
  return category
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function CategoryProductsPage() {
  const params = useParams<{ category: string }>();
  const rawCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const category = decodeURIComponent(rawCategory || "");

  const [products, setProducts] = useState<Product[]>([]);
  const { setSelectedCategory } = useCategory();

  useEffect(() => {
    if (!category) return;
    setSelectedCategory(category.toLowerCase().trim());

    axios.get("/api/products").then((res) => {
      setProducts(res.data);
    });
  }, [category, setSelectedCategory]);

  const categoryProducts = useMemo(
    () =>
      products.filter(
        (product) => product.category?.toLowerCase().trim() === category.toLowerCase().trim()
      ),
    [category, products]
  );

  return (
    <main className="min-h-screen bg-gray-100 text-black p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">{formatCategoryName(category)} Products</h1>
          <Link href="/" className="w-fit px-4 py-2 rounded bg-black text-white text-sm">
            Back to Home
          </Link>
        </div>

        {categoryProducts.length === 0 ? (
          <p className="text-gray-600">No products found in this category.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {categoryProducts.map((product) => (
              <Link key={product._id} href={`/product/${product._id}`}>
                <div className="bg-cyan-700 rounded-lg shadow p-3 hover:shadow-md h-full flex flex-col">
                  <div className="relative w-full h-36 sm:h-40">
                    <ProductImageWithEmblem
                      src={product.image}
                      alt={product.name}
                      emblemSize={50}
                      emblemClassName="top-1.5 right-1.5"
                    />
                  </div>

                  <div className="flex flex-col flex-grow">
                    <h3 className="mt-2 text-sm font-semibold line-clamp-2 min-h-[40px] text-white sm:text-base">{product.name}</h3>
                    <div className="mb-1">
                      {product.stock !== undefined && product.stock === 0 ? (
                        <span className="text-base font-bold text-red-300">Out of stock</span>
                      ) : product.stock !== undefined && product.stock <= 5 ? (
                        <span className="text-base font-bold text-orange-200">Quick! Few left</span>
                      ) : (
                        <span className="text-base font-bold text-green-300">In stock</span>
                      )}
                    </div>
                    {product.flashSale && (product.discountPercentage || 0) > 0 && (
                      <span className="inline-block w-fit mb-1 text-[11px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded">
                        Flash Sale {product.discountPercentage}% OFF
                      </span>
                    )}
                    {product.flashSale && (product.discountPercentage || 0) > 0 ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-red-600">
                          Rs {Math.round(product.price * (1 - (product.discountPercentage || 0) / 100))}
                        </p>
                        <p className="text-xs text-cyan-100 line-through">Rs {product.price}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-cyan-100">Rs {product.price}</p>
                    )}

                    <div className="mt-auto">
                      <button className="w-full bg-black text-white py-2.5 text-sm rounded sm:py-2">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
