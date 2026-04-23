"use client";
import { useEffect, useState } from "react";
import axios from "axios";

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  category: string;
  description?: string[];
  featured?: boolean;
  flashSale?: boolean;
  discountPercentage?: number;
};

type TrafficSummary = {
  totalPageViews: number;
  todayPageViews: number;
  totalUniqueVisitors: number;
  todayUniqueVisitors: number;
};

type TopPage = {
  path: string;
  views: number;
  visitors: number;
};

type DailyTraffic = {
  label: string;
  views: number;
  visitors: number;
};

export default function AdminClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [trafficSummary, setTrafficSummary] = useState<TrafficSummary | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [recentDailyViews, setRecentDailyViews] = useState<DailyTraffic[]>([]);
  const [trafficLoading, setTrafficLoading] = useState(true);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [flashSale, setFlashSale] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState("0");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [homeBannerLeft, setHomeBannerLeft] = useState("/banners/crazyaudios-banner-left.svg");
  const [homeBannerRight, setHomeBannerRight] = useState("/banners/crazyaudios-banner-right.svg");

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

  const fetchProducts = async () => {
    const res = await axios.get("/api/products");
    setProducts(res.data);
  };

  const fetchSettings = async () => {
    const res = await axios.get("/api/settings");
    setHomeBannerLeft(res.data?.homepageBanners?.left || "/banners/crazyaudios-banner-left.svg");
    setHomeBannerRight(res.data?.homepageBanners?.right || "/banners/crazyaudios-banner-right.svg");
  };

  const fetchTrafficAnalytics = async () => {
    try {
      setTrafficLoading(true);
      const res = await axios.get("/api/traffic");
      setTrafficSummary(res.data?.summary || null);
      setTopPages(res.data?.topPages || []);
      setRecentDailyViews(res.data?.recentDailyViews || []);
    } catch {
      setTrafficSummary(null);
      setTopPages([]);
      setRecentDailyViews([]);
    } finally {
      setTrafficLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSettings();
    fetchTrafficAnalytics();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const descArray = description
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item !== "");

    if (editingId) {
      await axios.put("/api/products", {
        id: editingId,
        name,
        price: Number(price),
        image,
        stock: Number(stock),
        category,
        description: descArray,
        featured,
        flashSale,
        discountPercentage: Number(discountPercentage),
      });
    } else {
      await axios.post("/api/products", {
        name,
        price: Number(price),
        image,
        stock: Number(stock),
        category,
        description: descArray,
        featured,
        flashSale,
        discountPercentage: Number(discountPercentage),
      });
    }

    setName("");
    setPrice("");
    setImage("");
    setStock("");
    setCategory("");
    setDescription("");
    setFeatured(false);
    setFlashSale(false);
    setDiscountPercentage("0");
    setEditingId(null);

    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    await axios.delete("/api/products", { data: { id } });
    fetchProducts();
  };

  const handleEdit = (product: Product) => {
    setEditingId(product._id);
    setName(product.name);
    setPrice(String(product.price));
    setImage(product.image);
    setStock(String(product.stock));
    setCategory(product.category);
    setDescription(product.description?.join("\n") || "");
    setFeatured(Boolean(product.featured));
    setFlashSale(Boolean(product.flashSale));
    setDiscountPercentage(String(product.discountPercentage || 0));

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFeaturedToggle = async (id: string, isFeatured: boolean) => {
    await axios.patch("/api/products", { id, featured: isFeatured });
    setProducts((prev) =>
      prev.map((product) =>
        product._id === id ? { ...product, featured: isFeatured } : product
      )
    );
  };

  const handleFlashSaleUpdate = async (
    id: string,
    isFlashSale: boolean,
    discount: number
  ) => {
    await axios.patch("/api/products", {
      id,
      flashSale: isFlashSale,
      discountPercentage: discount,
    });

    setProducts((prev) =>
      prev.map((product) =>
        product._id === id
          ? {
              ...product,
              flashSale: isFlashSale && discount > 0,
              discountPercentage: isFlashSale ? discount : 0,
            }
          : product
      )
    );
  };

  const saveHomepageBanners = async () => {
    await axios.put("/api/settings", {
      homepageBanners: { left: homeBannerLeft, right: homeBannerRight },
    });
    alert("Homepage banner pair updated");
  };

  const uniqueCategories = ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  const filteredProducts = selectedCategoryFilter === "All"
    ? products
    : products.filter((p) => p.category === selectedCategoryFilter);
  const maxDailyViews = Math.max(...recentDailyViews.map((day) => day.views), 1);

  return (
    <main className="min-h-screen bg-gray-200 text-black p-10">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      <section className="mb-10 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Traffic Analytics</h2>
            <p className="text-sm text-gray-600">
              Live site traffic overview from your own website visits data.
            </p>
          </div>
          <button
            onClick={fetchTrafficAnalytics}
            className="rounded-lg bg-black px-4 py-2 text-white self-start"
          >
            Refresh Analytics
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm font-medium text-gray-500">Total Page Views</p>
            <p className="mt-2 text-3xl font-bold">
              {trafficLoading ? "..." : trafficSummary?.totalPageViews ?? 0}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm font-medium text-gray-500">Today&apos;s Page Views</p>
            <p className="mt-2 text-3xl font-bold">
              {trafficLoading ? "..." : trafficSummary?.todayPageViews ?? 0}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm font-medium text-gray-500">Unique Visitors</p>
            <p className="mt-2 text-3xl font-bold">
              {trafficLoading ? "..." : trafficSummary?.totalUniqueVisitors ?? 0}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm font-medium text-gray-500">Today&apos;s Unique Visitors</p>
            <p className="mt-2 text-3xl font-bold">
              {trafficLoading ? "..." : trafficSummary?.todayUniqueVisitors ?? 0}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">Top Pages Last 7 Days</h3>
            <div className="space-y-3">
              {topPages.length > 0 ? (
                topPages.map((page) => (
                  <div
                    key={page.path}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{page.path}</p>
                      <p className="text-sm text-gray-500">{page.visitors} unique visitors</p>
                    </div>
                    <p className="ml-4 text-right font-semibold">{page.views} views</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  {trafficLoading ? "Loading top pages..." : "No traffic data yet."}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">Recent 7-Day Activity</h3>
            <div className="space-y-4">
              {recentDailyViews.length > 0 ? (
                recentDailyViews.map((day) => (
                  <div key={day.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{day.label}</span>
                      <span className="text-gray-600">
                        {day.views} views • {day.visitors} visitors
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${Math.max((day.views / maxDailyViews) * 100, 8)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  {trafficLoading ? "Loading recent activity..." : "No recent activity yet."}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-10">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
          <input
            placeholder="Product Name"
            className="w-full border p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Price"
            className="w-full border p-2"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            placeholder="Image URL"
            className="w-full border p-2"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
          <input
            placeholder="Stock"
            className="w-full border p-2"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          <input
            placeholder="Category"
            className="w-full border p-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <textarea
            placeholder="Description"
            className="w-full border p-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            Show on homepage as featured product
          </label>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={flashSale}
                onChange={(e) => setFlashSale(e.target.checked)}
              />
              Flash Sale
            </label>
            <input
              type="number"
              min={0}
              max={95}
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value)}
              className="w-28 border p-2 rounded"
              placeholder="Discount %"
            />
            <span>% off</span>
          </div>

          <button className="w-full bg-black text-white py-2">
            {editingId ? "Update Product" : "Add Product"}
          </button>
        </form>

        <div className="bg-white p-6 rounded-xl shadow space-y-3">
          <h2 className="font-semibold mb-1">Homepage Banner Pair</h2>
          <p className="text-sm text-gray-600">
            This dual banner appears after Featured Products and before the footer.
          </p>

          <input
            className="w-full border p-2"
            value={homeBannerLeft}
            onChange={(e) => setHomeBannerLeft(e.target.value)}
            placeholder="Left banner image URL"
          />
          <input
            className="w-full border p-2"
            value={homeBannerRight}
            onChange={(e) => setHomeBannerRight(e.target.value)}
            placeholder="Right banner image URL"
          />

          <button onClick={saveHomepageBanners} className="w-full bg-black text-white py-2">
            Save Homepage Banner
          </button>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <h2 className="text-2xl font-bold">Products List ({filteredProducts.length})</h2>
          <div className="flex items-center gap-2">
            <label className="font-semibold text-gray-700">Filter by Category:</label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="border p-2 rounded bg-white text-black capitalize shadow-sm"
            >
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-4">
          {filteredProducts.map((p) => (
          <div key={p._id} className="bg-gray-800 text-white p-3 flex justify-between items-center">
            <span>
              {p.name}
              {p.featured ? " - Featured" : ""}
              {p.flashSale ? ` - Flash Sale ${p.discountPercentage || 0}%` : ""}
            </span>
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-2 px-2 py-1 bg-gray-700 rounded text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(p.featured)}
                  onChange={(e) => handleFeaturedToggle(p._id, e.target.checked)}
                />
                Featured
              </label>
              <label className="flex items-center gap-2 px-2 py-1 bg-gray-700 rounded text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(p.flashSale)}
                  onChange={(e) =>
                    handleFlashSaleUpdate(
                      p._id,
                      e.target.checked,
                      e.target.checked
                        ? Number(p.discountPercentage || 10)
                        : Number(p.discountPercentage || 0)
                    )
                  }
                />
                Flash Sale
              </label>
              <input
                type="number"
                min={0}
                max={95}
                defaultValue={p.discountPercentage || 0}
                onBlur={(e) =>
                  handleFlashSaleUpdate(
                    p._id,
                    Boolean(p.flashSale),
                    Number(e.target.value || 0)
                  )
                }
                className="w-20 px-2 py-1 rounded text-black"
                title="Flash sale discount percentage"
              />
              <span className="text-xs text-gray-200">%</span>
              <button onClick={() => handleEdit(p)} className="bg-blue-500 px-2">
                Edit
              </button>
              <button onClick={() => handleDelete(p._id)} className="bg-red-500 px-2">
                Delete
              </button>
            </div>
          </div>
        ))}
        </div>
      </div>
    </main>
  );
}
