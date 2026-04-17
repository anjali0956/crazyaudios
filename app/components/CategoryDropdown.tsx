"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useCategory } from "./CategoryContext";
import { useRouter } from "next/navigation";

export default function CategoryDropdown() {
  const { selectedCategory, setSelectedCategory } = useCategory();
  const [categories, setCategories] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    axios.get("/api/products").then((res) => {
      const uniqueCategories = [
        "all",
        ...new Set((res.data as any[]).map((p) => p.category).filter(Boolean)),
      ] as string[];

      setCategories(uniqueCategories);
    });
  }, []);

  return (
    <select
      value={selectedCategory}
      onChange={(e) => {
        const value = e.target.value;
        setSelectedCategory(value);

        if (value === "all") {
          router.push("/");
          return;
        }

        router.push(`/category/${encodeURIComponent(value)}`);
      }}
      className="px-4 py-2 rounded bg-gray-800 text-white"
    >
      {categories.map((cat) => (
        <option key={cat} value={cat}>
          {cat.charAt(0).toUpperCase() + cat.slice(1)}
        </option>
      ))}
    </select>
  );
}
