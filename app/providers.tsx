"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import Link from "next/link";
import CategoryDropdown from "./components/CategoryDropdown";
import { CategoryProvider } from "./components/CategoryContext";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter, usePathname } from "next/navigation";

function Navbar() {
  const { data: session } = useSession();

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const router = useRouter();

  const updateSearch = (value: string) => {
    setSearch(value);
    localStorage.setItem("search", value);
    window.dispatchEvent(new Event("searchUpdate"));
  };

  useEffect(() => {
    const savedSearch = localStorage.getItem("search") || "";
    setSearch(savedSearch);
  }, []);

  // ✅ Fetch products once
  useEffect(() => {
    axios.get("/api/products").then((res) => {
      setProducts(res.data);
    });
  }, []);

  // ✅ Filter suggestions
  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }

    const filtered = products.filter((p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );

    setSuggestions(filtered.slice(0, 5));
  }, [search, products]);

  return (
    <nav className="flex flex-col gap-4 bg-black px-4 py-4 text-white sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">

      {/* LEFT */}
      <div className="flex w-full flex-col gap-2 lg:w-auto">
        <Link href="/" className="text-xl font-bold">
          CrazyAudios
        </Link>
        <CategoryDropdown />
      </div>

      {/* CENTER → 🔍 SEARCH WITH DROPDOWN */}
      <div className="flex w-full justify-center lg:flex-1">
        <div className="relative w-full max-w-md">

          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              updateSearch(value);
            }}
            className="w-full px-4 py-2 rounded-lg text-white bg-gray-800 border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
          />

          {/* 🔽 DROPDOWN */}
          {suggestions.length > 0 && (
            <div className="absolute top-12 w-full bg-white text-black rounded-lg shadow-lg z-50">

              {suggestions.map((item) => (
                <div
                  key={item._id}
                  onClick={() => {
                    router.push(`/product/${item._id}`);
                    updateSearch("");
                    setSuggestions([]);
                  }}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-200 cursor-pointer border-b last:border-none"
                >
                  <div className="relative w-10 h-10">
                    <img src={item.image} className="w-10 h-10 object-contain" />
                    <img
                      src="/emblems/ca-certified.svg"
                      alt="Crazy Audios emblem"
                      className="absolute -top-1 -right-1 w-5 h-5 object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)]"
                    />
                  </div>
                  <div>
                    <p className="text-sm">{item.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">₹{item.price}</p>
                      {item.stock !== undefined && item.stock === 0 ? (
                        <span className="text-lg font-medium text-orange-500">Out of stock</span>
                      ) : item.stock !== undefined && item.stock <= 5 ? (
                        <span className="block mt-2 text-2xl font-bold text-orange-500">
  Quick! Few left
</span>
                      ) : (
                        <span className="text-lg font-medium text-orange-500">In stock</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            </div>
          )}

        </div>
      </div>

      {/* RIGHT */}
      <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 text-sm sm:text-base lg:w-auto lg:justify-end lg:gap-6">
        <Link href="/">Home</Link>
        <Link href="/cart">Cart</Link>

        {!session && (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}

        {session && (
          <>
            {session.user?.role === "admin" && (
              <Link href="/admin">Admin</Link>
            )}
            <button onClick={() => signOut()}>
              Logout
            </button>
          </>
        )}
      </div>

    </nav>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      return;
    }

    let visitorId = localStorage.getItem("trafficVisitorId");

    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("trafficVisitorId", visitorId);
    }

    axios.post("/api/traffic", { path: pathname, visitorId }).catch(() => {});
  }, [pathname]);

  return (
    <SessionProvider>
      <CategoryProvider>
        <Navbar />
        {children}
      </CategoryProvider>
    </SessionProvider>
  );
}
