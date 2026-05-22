"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { useParams } from "next/navigation";
import ProductImageWithEmblem from "@/app/components/ProductImageWithEmblem";

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string;
  extraImages?: string[];
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!id) return;

    axios
      .get(`/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        setCurrentImageIndex(0);
      })
      .catch((err) => {
        console.error("Error fetching product:", err);
      });
  }, [id]);

  const galleryImages = useMemo(() => {
    if (!product) return [];

    const seen = new Set<string>();
    return [product.image, ...(product.extraImages || [])].filter((src) => {
      const normalized = String(src || "").trim();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }, [product]);

  const finalPrice = useMemo(() => {
    if (!product) return 0;
    if (!product.flashSale || (product.discountPercentage || 0) <= 0) return product.price;
    return Math.round(product.price * (1 - (product.discountPercentage || 0) / 100));
  }, [product]);

  const activeImage = galleryImages[currentImageIndex] || product?.image || "";

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
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 rounded-lg bg-white p-4 shadow-lg sm:p-6 md:grid-cols-2 lg:gap-10 lg:p-8">
        <div>
          <div className="relative h-72 w-full rounded-lg bg-white sm:h-96">
            <ProductImageWithEmblem
              src={activeImage}
              alt={product.name}
              emblemSize={102}
              className="rounded-lg object-contain"
              emblemClassName="top-3 right-3"
            />

            {galleryImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev === 0 ? galleryImages.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-white transition hover:bg-black"
                  aria-label="Previous product image"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                    <path
                      d="M14.5 5 8 12l6.5 7"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length)
                  }
                  className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-white transition hover:bg-black"
                  aria-label="Next product image"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                    <path
                      d="M9.5 5 16 12l-6.5 7"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            ) : null}
          </div>

          {galleryImages.length > 1 ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">More Photos</p>
                <p className="text-sm text-gray-500">
                  Photo {currentImageIndex + 1} of {galleryImages.length}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                {galleryImages.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative h-20 overflow-hidden rounded-lg border-2 bg-white ${
                      currentImageIndex === index
                        ? "border-blue-700 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    aria-label={`View product image ${index + 1}`}
                  >
                    <Image
                      src={src}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      fill
                      className="object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <h1 className="mb-4 text-2xl font-bold text-black sm:text-3xl">{product.name}</h1>

          <div className="mb-4">
            {product.stock !== undefined && product.stock === 0 ? (
              <span className="text-xl font-bold text-red-600">Out of stock</span>
            ) : product.stock !== undefined && product.stock <= 5 ? (
              <span className="animate-pulse text-xl font-bold text-orange-500">Quick! Few left</span>
            ) : (
              <span className="text-lg font-semibold text-green-600">In stock</span>
            )}
          </div>

          {product.flashSale && (product.discountPercentage || 0) > 0 && (
            <span className="mb-2 inline-block rounded bg-red-100 px-3 py-1 text-sm font-semibold text-red-600">
              Flash Sale {product.discountPercentage}% OFF
            </span>
          )}

          {product.flashSale && (product.discountPercentage || 0) > 0 ? (
            <div className="mb-4 flex items-center gap-3">
              <p className="text-2xl font-bold text-red-600 sm:text-3xl">Rs {finalPrice}</p>
              <p className="text-lg text-gray-500 line-through sm:text-xl">Rs {product.price}</p>
            </div>
          ) : (
            <p className="mb-4 text-xl text-black sm:text-2xl">Rs {product.price}</p>
          )}

          <ul className="mb-6 list-disc space-y-2 pl-5 text-black">
            {product.description?.map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>

          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              className="min-h-11 rounded bg-gray-300 px-4 py-2 disabled:opacity-50"
              disabled={quantity === 1}
            >
              -
            </button>

            <span className="text-lg font-semibold">{quantity}</span>

            <button
              onClick={() => setQuantity((prev) => prev + 1)}
              className="min-h-11 rounded bg-gray-300 px-4 py-2"
            >
              +
            </button>
          </div>

          <button
            onClick={addToCart}
            className="mb-6 w-full rounded-lg bg-black px-6 py-3 text-white transition hover:bg-gray-800 sm:w-auto"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </main>
  );
}
