"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string;
  extraImages?: string[];
  stock: number;
  category: string;
  weightGrams?: number | null;
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

type Order = {
  _id: string;
  receipt: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  fulfillmentStatus?: string;
  courierName?: string;
  trackingNumber?: string;
  estimatedDelivery?: string | null;
};

type OrderDraft = {
  fulfillmentStatus: string;
  courierName: string;
  trackingNumber: string;
  estimatedDelivery: string;
  note: string;
  location: string;
};

export default function AdminClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trafficSummary, setTrafficSummary] = useState<TrafficSummary | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [recentDailyViews, setRecentDailyViews] = useState<DailyTraffic[]>([]);
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [extraImages, setExtraImages] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [flashSale, setFlashSale] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState("0");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [homeBannerLeft, setHomeBannerLeft] = useState("/banners/crazyaudios-banner-left.svg");
  const [homeBannerRight, setHomeBannerRight] = useState("/banners/crazyaudios-banner-right.svg");

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [productSearch, setProductSearch] = useState("");
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, OrderDraft>>({});
  const productFormRef = useRef<HTMLFormElement | null>(null);

  const fetchProducts = async () => {
    const res = await axios.get("/api/products");
    setProducts(res.data);
  };

  const fetchSettings = async () => {
    const res = await axios.get("/api/settings");
    setHomeBannerLeft(res.data?.homepageBanners?.left || "/banners/crazyaudios-banner-left.svg");
    setHomeBannerRight(res.data?.homepageBanners?.right || "/banners/crazyaudios-banner-right.svg");
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await axios.get("/api/admin/orders");
      const nextOrders = res.data || [];
      setOrders(nextOrders);
      setOrderStatusDrafts(
        nextOrders.reduce((acc: Record<string, OrderDraft>, order: Order) => {
          acc[order._id] = {
            fulfillmentStatus: order.fulfillmentStatus || "processing",
            courierName: order.courierName || "",
            trackingNumber: order.trackingNumber || "",
            estimatedDelivery: order.estimatedDelivery
              ? new Date(order.estimatedDelivery).toISOString().split("T")[0]
              : "",
            note: "",
            location: "",
          };
          return acc;
        }, {})
      );
    } catch {
      setOrders([]);
      setOrderStatusDrafts({});
    } finally {
      setOrdersLoading(false);
    }
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
    fetchOrders();
  }, []);

  const resetProductForm = () => {
    setName("");
    setPrice("");
    setImage("");
    setExtraImages("");
    setStock("");
    setCategory("");
    setWeightGrams("");
    setDescription("");
    setFeatured(false);
    setFlashSale(false);
    setDiscountPercentage("0");
    setEditingId(null);
  };

  const updateOrderDraft = (orderId: string, field: keyof OrderDraft, value: string) => {
    setOrderStatusDrafts((prev) => ({
      ...prev,
      [orderId]: {
        fulfillmentStatus: prev[orderId]?.fulfillmentStatus || "processing",
        courierName: prev[orderId]?.courierName || "",
        trackingNumber: prev[orderId]?.trackingNumber || "",
        estimatedDelivery: prev[orderId]?.estimatedDelivery || "",
        note: prev[orderId]?.note || "",
        location: prev[orderId]?.location || "",
        [field]: value,
      },
    }));
  };

  const updateOrderTracking = async (orderId: string) => {
    const draft = orderStatusDrafts[orderId];
    if (!draft) return;

    await axios.patch("/api/admin/orders", {
      orderId,
      fulfillmentStatus: draft.fulfillmentStatus,
      courierName: draft.courierName,
      trackingNumber: draft.trackingNumber,
      estimatedDelivery: draft.estimatedDelivery,
      note: draft.note,
      location: draft.location,
    });

    await fetchOrders();
    alert("Order tracking updated");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const descArray = description
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item !== "");
    const extraImageArray = extraImages
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item !== "");

    if (editingId) {
      await axios.put("/api/products", {
        id: editingId,
        name,
        price: Number(price),
        image,
        extraImages: extraImageArray,
        stock: Number(stock),
        category,
        weightGrams: weightGrams.trim() === "" ? null : Number(weightGrams),
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
        extraImages: extraImageArray,
        stock: Number(stock),
        category,
        weightGrams: weightGrams.trim() === "" ? null : Number(weightGrams),
        description: descArray,
        featured,
        flashSale,
        discountPercentage: Number(discountPercentage),
      });
    }

    resetProductForm();

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
    setExtraImages(product.extraImages?.join("\n") || "");
    setStock(String(product.stock));
    setCategory(product.category);
    setWeightGrams(
      product.weightGrams === null || product.weightGrams === undefined
        ? ""
        : String(product.weightGrams)
    );
    setDescription(product.description?.join("\n") || "");
    setFeatured(Boolean(product.featured));
    setFlashSale(Boolean(product.flashSale));
    setDiscountPercentage(String(product.discountPercentage || 0));
    requestAnimationFrame(() => {
      productFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
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
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategoryFilter === "All" || p.category === selectedCategoryFilter;
    const matchesSearch = p.name
      .toLowerCase()
      .includes(productSearch.toLowerCase().trim());
    return matchesCategory && matchesSearch;
  });
  const maxDailyViews = Math.max(...recentDailyViews.map((day) => day.views), 1);

  return (
    <main className="min-h-screen bg-gray-200 p-10 text-black">
      <h1 className="mb-8 text-3xl font-bold">Admin Panel</h1>

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
            className="self-start rounded-lg bg-black px-4 py-2 text-white"
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

      <section className="mb-10 rounded-2xl bg-white p-6 shadow">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Order Tracking</h2>
            <p className="text-sm text-gray-600">
              Update live order progress so customers can see courier details, ETA, and timeline changes.
            </p>
          </div>
          <button
            onClick={fetchOrders}
            className="self-start rounded-lg bg-black px-4 py-2 text-white"
          >
            Refresh Orders
          </button>
        </div>

        {ordersLoading ? (
          <p className="text-sm text-gray-500">Loading paid orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500">No paid orders yet to track.</p>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => {
              const draft = orderStatusDrafts[order._id] || {
                fulfillmentStatus: "processing",
                courierName: "",
                trackingNumber: "",
                estimatedDelivery: "",
                note: "",
                location: "",
              };

              return (
                <div key={order._id} className="rounded-xl border border-gray-200 p-5">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{order.receipt}</h3>
                      <p className="text-sm text-gray-600">
                        {order.customerName} • {order.customerEmail}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-700">₹{order.totalAmount}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <select
                      value={draft.fulfillmentStatus}
                      onChange={(e) =>
                        updateOrderDraft(order._id, "fulfillmentStatus", e.target.value)
                      }
                      className="rounded-lg border border-gray-300 p-3"
                    >
                      <option value="processing">Processing</option>
                      <option value="packed">Packed</option>
                      <option value="shipped">Shipped</option>
                      <option value="out_for_delivery">Out for delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <input
                      value={draft.courierName}
                      onChange={(e) =>
                        updateOrderDraft(order._id, "courierName", e.target.value)
                      }
                      placeholder="Courier name"
                      className="rounded-lg border border-gray-300 p-3"
                    />

                    <input
                      value={draft.trackingNumber}
                      onChange={(e) =>
                        updateOrderDraft(order._id, "trackingNumber", e.target.value)
                      }
                      placeholder="Tracking number"
                      className="rounded-lg border border-gray-300 p-3"
                    />

                    <input
                      type="date"
                      value={draft.estimatedDelivery}
                      onChange={(e) =>
                        updateOrderDraft(order._id, "estimatedDelivery", e.target.value)
                      }
                      className="rounded-lg border border-gray-300 p-3"
                    />

                    <input
                      value={draft.location}
                      onChange={(e) =>
                        updateOrderDraft(order._id, "location", e.target.value)
                      }
                      placeholder="Current location"
                      className="rounded-lg border border-gray-300 p-3"
                    />

                    <input
                      value={draft.note}
                      onChange={(e) => updateOrderDraft(order._id, "note", e.target.value)}
                      placeholder="Customer-facing update note"
                      className="rounded-lg border border-gray-300 p-3"
                    />
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => updateOrderTracking(order._id)}
                      className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white"
                    >
                      Save Tracking Update
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-10 md:grid-cols-2">
        <form
          ref={productFormRef}
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl bg-white p-6 shadow"
        >
          <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {editingId ? "Edit Product" : "Add Product"}
              </h2>
              <p className="text-sm text-gray-600">
                {editingId
                  ? `Editing: ${name || "Selected product"}`
                  : "Create a new product and save it to the store catalog."}
              </p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetProductForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Cancel Edit
              </button>
            )}
          </div>
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
          <textarea
            placeholder="Extra Image URLs (one per line)"
            className="w-full border p-2"
            value={extraImages}
            onChange={(e) => setExtraImages(e.target.value)}
            rows={4}
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
          <input
            placeholder="Weight (grams)"
            className="w-full border p-2"
            type="number"
            min="0"
            step="0.01"
            value={weightGrams}
            onChange={(e) => setWeightGrams(e.target.value)}
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
              className="w-28 rounded border p-2"
              placeholder="Discount %"
            />
            <span>% off</span>
          </div>

          <button className="w-full bg-black py-2 text-white">
            {editingId ? "Update Product" : "Add Product"}
          </button>
        </form>

        <div className="space-y-3 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-1 font-semibold">Homepage Banner Pair</h2>
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

          <button onClick={saveHomepageBanners} className="w-full bg-black py-2 text-white">
            Save Homepage Banner
          </button>
        </div>
      </div>

        <div className="mt-10">
        <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-bold">Products List ({filteredProducts.length})</h2>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded bg-white p-2 text-black shadow-sm sm:w-72"
            />
            <div className="flex items-center gap-2">
            <label className="font-semibold text-gray-700">Filter by Category:</label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="rounded bg-white p-2 capitalize text-black shadow-sm"
            >
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {filteredProducts.map((p) => (
            <div
              key={p._id}
              className="flex items-center justify-between bg-gray-800 p-3 text-white"
            >
              <span>
                {p.name}
                {p.featured ? " - Featured" : ""}
                {p.flashSale ? ` - Flash Sale ${p.discountPercentage || 0}%` : ""}
                {p.weightGrams ? ` - ${p.weightGrams}g` : " - No weight set"}
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 rounded bg-gray-700 px-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(p.featured)}
                    onChange={(e) => handleFeaturedToggle(p._id, e.target.checked)}
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 rounded bg-gray-700 px-2 py-1 text-sm">
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
                  className="w-20 rounded px-2 py-1 text-black"
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
