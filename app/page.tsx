"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useCategory } from "./components/CategoryContext";
import ProductImageWithEmblem from "./components/ProductImageWithEmblem";

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  featured?: boolean;
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

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const { setSelectedCategory } = useCategory();

  const [heroSlide, setHeroSlide] = useState(0);
  const [search, setSearch] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [homepageBanners, setHomepageBanners] = useState({
    left: "/banners/crazyaudios-banner-left.svg",
    right: "/banners/crazyaudios-banner-right.svg",
  });

  useEffect(() => {
    setSelectedCategory("all");

    axios.get("/api/products").then((res) => {
      setProducts(res.data);
    });

    const saved = JSON.parse(localStorage.getItem("homepageBanners") || "{}");
    setHomepageBanners({
      left: saved.left || "/banners/crazyaudios-banner-left.svg",
      right: saved.right || "/banners/crazyaudios-banner-right.svg",
    });
  }, [setSelectedCategory]);

  const handleScrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const featuredProducts = useMemo(
    () => products.filter((product) => Boolean(product.featured)),
    [products]
  );

  const categoryCards = useMemo(() => {
    const seen = new Set<string>();
    return products
      .filter((product) => product.category)
      .filter((product) => {
        const key = product.category.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((product) => ({
        category: product.category,
        image: product.image,
      }));
  }, [products]);

  const heroBanners = [
    { src: "/banners/peerless-store-audio.svg", link: "/category/speaker", className: "object-contain object-center" },
    { src: "/banners/ca-certified-banner.svg", className: "object-contain object-center" },
    { src: "/banners/brainsaudios-banner.svg", link: "/category/tonecontrol", className: "object-contain object-center" },
    { src: "/banners/crazyaudios-flea-market-banner.svg", className: "object-contain object-center" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroBanners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroBanners.length]);

  useEffect(() => {
    const handleSearch = () => {
      const value = localStorage.getItem("search") || "";
      setSearch(value);
    };
    window.addEventListener("searchUpdate", handleSearch);
    return () => window.removeEventListener("searchUpdate", handleSearch);
  }, []);

  const filteredFeaturedProducts = featuredProducts.filter((product) => {
    const matchesSearch = product.name?.toLowerCase().includes(search.toLowerCase());
    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "0-500" && product.price >= 0 && product.price <= 500) ||
      (priceFilter === "500-2000" && product.price > 500 && product.price <= 2000) ||
      (priceFilter === "2000-5000" && product.price > 2000 && product.price <= 5000) ||
      (priceFilter === "5000-10000" && product.price > 5000 && product.price <= 10000) ||
      (priceFilter === "10000+" && product.price > 10000);
    return matchesSearch && matchesPrice;
  });

  return (
    <main className="min-h-screen bg-gray-100 text-black flex flex-col">
      <section className="w-full bg-gray-100 pb-4">
        <div className="w-full">
          <div className="relative w-full h-[140px] sm:h-[210px] md:h-[270px] lg:h-[300px] overflow-hidden bg-black">
            <div
              className="flex h-full transition-transform duration-700 ease-in-out"
              style={{ width: `${heroBanners.length * 100}%`, transform: `translateX(-${heroSlide * (100 / heroBanners.length)}%)` }}
            >
              {heroBanners.map((banner, index) => (
                <div key={banner.src} className="relative h-full" style={{ width: `${100 / heroBanners.length}%` }}>
                  {banner.link ? (
                    <Link href={banner.link} className="block w-full h-full relative">
                      <Image
                        src={banner.src}
                        alt={`Homepage banner ${index + 1}`}
                        fill
                      className={banner.className || "object-cover object-center"}
                        priority={index === 0}
                      />
                    </Link>
                  ) : (
                    <Image
                      src={banner.src}
                      alt={`Homepage banner ${index + 1}`}
                      fill
                    className={banner.className || "object-cover object-center"}
                      priority={index === 0}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex-grow p-4 sm:p-6 lg:p-10">
        <div className="mb-8">
          <div className="max-w-4xl mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">Price Filter</p>
              <p className="text-sm text-gray-600 whitespace-nowrap min-w-[80px]">
                {priceFilter === "all" && "All"}
                {priceFilter === "0-500" && "Rs 0-Rs 500"}
                {priceFilter === "500-2000" && "Rs 500-Rs 2000"}
                {priceFilter === "2000-5000" && "Rs 2000-Rs 5000"}
                {priceFilter === "5000-10000" && "Rs 5000-Rs 10000"}
                {priceFilter === "10000+" && "Above Rs 10000"}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { label: "All", value: "all" },
                { label: "Rs 0-Rs 500", value: "0-500" },
                { label: "Rs 500-Rs 2000", value: "500-2000" },
                { label: "Rs 2000-Rs 5000", value: "2000-5000" },
                { label: "Rs 5000-Rs 10000", value: "5000-10000" },
                { label: "Above Rs 10000", value: "10000+" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setPriceFilter(item.value)}
                  className={`px-3 py-1.5 text-sm rounded-md border whitespace-nowrap transition ${
                    priceFilter === item.value ? "bg-black text-white" : "bg-gray-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center sm:text-3xl">Featured Products</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {filteredFeaturedProducts.map((product) => (
            <div key={product._id}>
              <Link href={`/product/${product._id}`}>
                <div className="bg-blue-800 rounded-lg shadow p-3 hover:shadow-md h-full flex flex-col">
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
                        <p className="text-xs text-blue-100 line-through">Rs {product.price}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-blue-100">Rs {product.price}</p>
                    )}

                    <div className="mt-auto">
                      <button className="w-full bg-black text-white py-2.5 text-sm rounded sm:py-2">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {filteredFeaturedProducts.length === 0 && (
          <p className="text-center text-gray-600 mt-8">
            No featured products found for this filter. Mark products as featured in Admin.
          </p>
        )}
      </section>

      <section className="px-4 pb-8 sm:px-6 lg:px-10 lg:pb-10">
        <h2 className="text-2xl font-bold mb-4 sm:text-3xl">Categories</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4">
          {categoryCards.map((item) => (
            <Link
              key={item.category}
              href={`/category/${encodeURIComponent(item.category)}`}
              className="bg-blue-800 rounded-lg border border-blue-900 p-3 shadow-sm hover:shadow-md transition sm:p-4"
            >
              <div className="relative w-full h-28 rounded-lg bg-blue-700 overflow-hidden sm:h-44">
                <Image
                  src={item.image}
                  alt={formatCategoryName(item.category)}
                  fill
                  className="object-contain p-3"
                />
              </div>
              <p className="mt-3 text-white text-base leading-6 font-semibold sm:mt-4 sm:text-2xl sm:leading-8">
                {formatCategoryName(item.category)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-6 lg:px-10 lg:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Link href="/category/diode" className="relative block h-[160px] sm:h-[220px] md:h-[280px] rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <Image src={homepageBanners.left} alt="CrazyAudios promo banner 1" fill className="object-cover" />
          </Link>
        <Link href="/" onClick={handleScrollToTop} className="relative block h-[160px] sm:h-[220px] md:h-[280px] rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <Image src={homepageBanners.right} alt="CrazyAudios promo banner 2" fill className="object-cover" />
        </Link>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-6 lg:px-10 lg:pb-10">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:p-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4 text-center hover:shadow-md transition">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <path d="M3 7h11v8H3z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M14 10h4l3 3v2h-7z" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Same Day Shipping</h3>
              <p className="mt-1 text-sm text-gray-600">Mon-Sat till 2:00PM on most orders</p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4 text-center hover:shadow-md transition">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Provide Warranty</h3>
              <p className="mt-1 text-sm text-gray-600">Seller and manufacturer warranty</p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4 text-center hover:shadow-md transition">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <path
                    d="M12 2v20M17 6.5a4.5 4.5 0 0 0-9 0c0 2.5 2.2 3.5 4.6 4.2 2.3.7 4.4 1.5 4.4 4a4.5 4.5 0 0 1-9 0"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Best Prices</h3>
              <p className="mt-1 text-sm text-gray-600">Best prices in India</p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4 text-center hover:shadow-md transition">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <path d="M4 12a8 8 0 1 1 16 0" stroke="currentColor" strokeWidth="1.8" />
                  <rect x="3" y="12" width="4" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                  <rect x="17" y="12" width="4" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 20h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Customer Support</h3>
              <p className="mt-1 text-sm text-gray-600">Industry leading support</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-black text-white pt-10 mt-10 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold text-orange-400">CRAZY AUDIOS</h2>
            <p className="text-sm text-gray-400 mt-2">Your Ideas, Our Parts</p>

            <p className="text-sm mt-4 text-gray-400">
              Got Questions? Call us between 9:15 AM to 6:15 PM Monday-Saturday
            </p>

            <p className="mt-2 font-semibold text-white">+91-9656006900</p>

            <div className="mt-6">
              <h3 className="font-semibold mb-3">Policies</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Shipping & Refund</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Information</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Track Your Order</li>
              <li>FAQ</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">My Account</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Cart</li>
              <li>Checkout</li>
              <li>My Account</li>
              <li>Payment Options</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Services</h3>
            <ul className="space-y-2 text-sm text-gray-400 mb-4">
              <li>About Us</li>
              <li>Contact Us</li>
            </ul>

            <div className="mt-4">
              <Image
                src="/logo-new.jpg"
                alt="Crazy Audios Logo"
                width={500}
                height={160}
                className="object-contain"
              />
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-400 mt-10 pb-6">
          <p>Contact: craudyaudios@gmail.com</p>
          <p className="mt-1">Made with love by rat</p>
        </div>
      </footer>
    </main>
  );
}
