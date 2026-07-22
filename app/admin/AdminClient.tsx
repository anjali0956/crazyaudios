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

type Address = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

type OrderItem = {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

type Order = {
  _id: string;
  receipt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  status: string;
  createdAt?: string;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
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
  const [adminView, setAdminView] = useState<"catalog" | "orders" | "analytics">("catalog");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [trafficSummary, setTrafficSummary] = useState<TrafficSummary | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [recentDailyViews, setRecentDailyViews] = useState<DailyTraffic[]>([]);
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [extraImages, setExtraImages] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [extraImagesUploading, setExtraImagesUploading] = useState(false);
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
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [promotionFilter, setPromotionFilter] = useState<"all" | "featured" | "flash">("all");
  const [productSearch, setProductSearch] = useState("");
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, OrderDraft>>({});
  const productFormRef = useRef<HTMLFormElement | null>(null);

  const formatCurrency = (value: number) => `Rs ${Number(value || 0).toFixed(2)}`;

  const getFulfillmentBadgeClasses = (status?: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "bg-green-100 text-green-700";
      case "shipped":
      case "out_for_delivery":
        return "bg-blue-100 text-blue-700";
      case "packed":
        return "bg-amber-100 text-amber-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "processing":
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatFulfillmentStatus = (status?: string) =>
    String(status || "processing")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const getStockState = (stockValue: number) => {
    if (stockValue <= 0) return "out";
    if (stockValue <= 10) return "low";
    return "in";
  };

  const getStockBadgeClasses = (stockValue: number) => {
    const state = getStockState(stockValue);

    if (state === "out") return "bg-red-100 text-red-700";
    if (state === "low") return "bg-amber-100 text-amber-700";
    return "bg-green-100 text-green-700";
  };

  const getStockLabel = (stockValue: number) => {
    const state = getStockState(stockValue);
    if (state === "out") return "Out of stock";
    if (state === "low") return "Low stock";
    return "In stock";
  };

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

  useEffect(() => {
    if (orders.length === 0) {
      setSelectedOrderId(null);
      return;
    }

    const stillExists = orders.some((order) => order._id === selectedOrderId);
    if (!stillExists) {
      setSelectedOrderId(orders[0]._id);
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    setCurrentProductPage(1);
  }, [selectedCategoryFilter, stockFilter, promotionFilter, productSearch]);

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

  const uploadProductImages = async (files: FileList | File[]) => {
    const fileArray = Array.from(files || []);

    if (fileArray.length === 0) {
      return [] as string[];
    }

    const formData = new FormData();
    fileArray.forEach((file) => formData.append("files", file));

    const res = await axios.post("/api/admin/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return Array.isArray(res.data?.files) ? res.data.files : [];
  };

  const handlePrimaryImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setImageUploading(true);
      const uploadedFiles = await uploadProductImages(files);
      if (uploadedFiles[0]) {
        setImage(uploadedFiles[0]);
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || error?.message || "Could not upload image");
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  };

  const handleExtraImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setExtraImagesUploading(true);
      const uploadedFiles = await uploadProductImages(files);
      if (uploadedFiles.length > 0) {
        setExtraImages((prev) =>
          [...prev.split("\n").map((item) => item.trim()).filter(Boolean), ...uploadedFiles].join("\n")
        );
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || error?.message || "Could not upload extra images");
    } finally {
      setExtraImagesUploading(false);
      event.target.value = "";
    }
  };

  const updateOrderTracking = async (orderId: string) => {
    const draft = orderStatusDrafts[orderId];
    if (!draft) return;

    try {
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
    } catch (error: any) {
      alert(
        error?.response?.data?.error ||
          error?.message ||
          "Could not update order status"
      );
    }
  };

  const formatAddressBlock = (address?: Address) => {
    if (!address) return "";

    return [
      address.name,
      address.phone,
      address.email,
      address.address,
      `${address.city}, ${address.state} - ${address.pincode}`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const formatShippingLabel = (order: Order) => {
    const address = order.shippingAddress;
    if (!address) return "";

    return [
      "FROM",
      "ELECTROSUPPLY",
      "NAKKARA COMPLEX",
      "Town Hall Road",
      "Irinjalakuda, Thrissur, Kerala",
      "PIN - 680121",
      "",
      "TO",
      address.name,
      address.address,
      `${address.city}, ${address.state} - ${address.pincode}`,
      address.phone,
      "",
      `ORDER ID: ${order.receipt}`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const copyOrderAddress = async (order: Order) => {
    const addressText = [
      `Order: ${order.receipt}`,
      `Customer: ${order.customerName}`,
      `Customer Phone: ${order.customerPhone}`,
      "",
      "Shipping Address",
      formatAddressBlock(order.shippingAddress),
      "",
      "Billing Address",
      formatAddressBlock(order.billingAddress),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(addressText);
      alert("Address details copied");
    } catch {
      alert("Could not copy address details");
    }
  };

  const copyShippingLabel = async (order: Order) => {
    try {
      await navigator.clipboard.writeText(formatShippingLabel(order));
      alert("Shipping label copied");
    } catch {
      alert("Could not copy shipping label");
    }
  };

  const printShippingLabels = (ordersToPrint: Order[], labelsPerPage?: 4 | 8) => {
    const validOrders = ordersToPrint.filter((order) => formatShippingLabel(order));

    if (validOrders.length === 0) {
      alert("Shipping label is not available for these orders");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      alert("Popup blocked. Please allow popups to print the label.");
      return;
    }

    const resolvedLabelsPerPage: 1 | 4 | 8 =
      validOrders.length <= 1 ? 1 : labelsPerPage === 8 ? 8 : 4;

    const printableOrders = validOrders.slice(0, resolvedLabelsPerPage);

    const escapedLabels = printableOrders.map((order) =>
      formatShippingLabel(order)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    );

    const sheetClassName =
      resolvedLabelsPerPage === 8
        ? "sheet sheet-8"
        : resolvedLabelsPerPage === 4
          ? "sheet sheet-4"
          : "sheet sheet-1";
    const labelClassName =
      resolvedLabelsPerPage === 8
        ? "label label-8"
        : resolvedLabelsPerPage === 4
          ? "label label-4"
          : "label label-1";

    const labelsMarkup = escapedLabels
      .map(
        (escapedLabel) => `
      <div class="${labelClassName}">
        <div class="heading">ELECTROSUPPLY</div>
        <div class="content">${escapedLabel}</div>
        <div class="footer">ElectroSupply - Shipping label</div>
      </div>`
      )
      .join("");

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Shipping Labels</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: #ffffff;
        color: #111111;
      }
      .sheet {
        width: 100%;
        min-height: calc(297mm - 20mm);
        display: grid;
        align-content: start;
      }
      .sheet-1 {
        grid-template-columns: 1fr;
        gap: 0;
      }
      .sheet-4 {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 8mm;
      }
      .sheet-8 {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: repeat(4, 1fr);
        gap: 4mm;
      }
      .label {
        width: 100%;
        border: 2px solid #111111;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
      }
      .label-1 {
        min-height: 92mm;
        padding: 8mm 7mm;
      }
      .label-4 {
        min-height: 92mm;
        padding: 8mm 7mm;
      }
      .label-8 {
        min-height: 42mm;
        padding: 4mm 4.5mm;
      }
      .heading {
        font-size: 13pt;
        font-weight: 700;
        letter-spacing: 0.12em;
        margin-bottom: 1.5mm;
      }
      .label-8 .heading {
        font-size: 10pt;
        margin-bottom: 1mm;
      }
      .content {
        white-space: pre-wrap;
        font-size: 11pt;
        line-height: 1.35;
        font-weight: 600;
      }
      .label-8 .content {
        font-size: 8pt;
        line-height: 1.15;
      }
      .footer {
        margin-top: 3mm;
        font-size: 8pt;
        color: #444444;
      }
      .label-8 .footer {
        margin-top: 1.5mm;
        font-size: 6.5pt;
      }
    </style>
  </head>
  <body>
    <div class="${sheetClassName}">
      ${labelsMarkup}
    </div>
    <script>
      window.onload = function () {
        window.focus();
        window.print();
      };
    </script>
  </body>
</html>`);
    printWindow.document.close();
  };

  const printShippingLabel = (order: Order) => {
    printShippingLabels([order]);
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
    const productStockState = getStockState(Number(p.stock || 0));
    const matchesStock = stockFilter === "all" || stockFilter === productStockState;
    const matchesPromotion =
      promotionFilter === "all" ||
      (promotionFilter === "featured" && Boolean(p.featured)) ||
      (promotionFilter === "flash" && Boolean(p.flashSale));

    return matchesCategory && matchesSearch && matchesStock && matchesPromotion;
  }).sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });
  const maxDailyViews = Math.max(...recentDailyViews.map((day) => day.views), 1);
  const selectedOrder =
    orders.find((order) => order._id === selectedOrderId) || orders[0] || null;
  const PRODUCTS_PER_PAGE = 20;
  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const safeCurrentProductPage = Math.min(currentProductPage, totalProductPages);
  const paginatedProducts = filteredProducts.slice(
    (safeCurrentProductPage - 1) * PRODUCTS_PER_PAGE,
    safeCurrentProductPage * PRODUCTS_PER_PAGE
  );
  const readyToShipOrders = orders.filter((order) =>
    ["packed", "shipped", "out_for_delivery"].includes(
      String(order.fulfillmentStatus || "").toLowerCase()
    )
  );

  return (
    <main className="min-h-screen bg-gray-200 p-10 text-black">
      <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage products, banners, analytics, and customer orders from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setAdminView("catalog")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              adminView === "catalog"
                ? "bg-black text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Catalog & Products
          </button>
          <button
            type="button"
            onClick={() => setAdminView("analytics")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              adminView === "analytics"
                ? "bg-emerald-700 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Traffic Analytics
          </button>
          <button
            type="button"
            onClick={() => setAdminView("orders")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              adminView === "orders"
                ? "bg-blue-700 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Orders & Tracking
          </button>
        </div>
      </div>

      {adminView === "orders" ? (
        <section className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Orders & Tracking</h2>
                <p className="text-sm text-gray-600">
                  Review paid orders in a cleaner table, then open one order at a time for address and fulfillment updates.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => printShippingLabels(readyToShipOrders, 4)}
                  disabled={readyToShipOrders.length === 0}
                  className="self-start rounded-lg bg-blue-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Print Ready Labels 4/Page ({Math.min(readyToShipOrders.length, 4)})
                </button>
                <button
                  onClick={() => printShippingLabels(readyToShipOrders, 8)}
                  disabled={readyToShipOrders.length <= 1}
                  className="self-start rounded-lg bg-indigo-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Print Ready Labels 8/Page ({Math.min(readyToShipOrders.length, 8)})
                </button>
                <button
                  onClick={fetchOrders}
                  className="self-start rounded-lg bg-black px-4 py-2 text-white"
                >
                  Refresh Orders
                </button>
              </div>
            </div>

            {ordersLoading ? (
              <p className="text-sm text-gray-500">Loading paid orders...</p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-gray-500">No paid orders yet to track.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Fulfillment</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {orders.map((order) => (
                      <tr
                        key={order._id}
                        className={`transition hover:bg-blue-50 ${
                          selectedOrder?._id === order._id ? "bg-blue-50/80" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900">{order.receipt}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{order.customerName}</p>
                          <p className="text-xs text-gray-500">{order.customerPhone}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{order.items?.length || 0}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                            {String(order.status || "paid").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getFulfillmentBadgeClasses(
                              order.fulfillmentStatus
                            )}`}
                          >
                            {formatFulfillmentStatus(order.fulfillmentStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString("en-IN")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(order._id)}
                            className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedOrder ? (
            <section className="rounded-2xl bg-white p-6 shadow">
              {(() => {
                const draft = orderStatusDrafts[selectedOrder._id] || {
                  fulfillmentStatus: "processing",
                  courierName: "",
                  trackingNumber: "",
                  estimatedDelivery: "",
                  note: "",
                  location: "",
                };

                return (
                  <>
                    <div className="mb-5 flex flex-col gap-3 border-b border-gray-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                          Selected Order
                        </p>
                        <h3 className="mt-1 text-2xl font-bold">{selectedOrder.receipt}</h3>
                        <p className="text-sm text-gray-600">
                          {selectedOrder.customerName} • {selectedOrder.customerEmail} • {selectedOrder.customerPhone}
                        </p>
                        {selectedOrder.createdAt ? (
                          <p className="mt-1 text-xs text-gray-500">
                            Ordered on {new Date(selectedOrder.createdAt).toLocaleString("en-IN")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getFulfillmentBadgeClasses(
                            selectedOrder.fulfillmentStatus
                          )}`}
                        >
                          {formatFulfillmentStatus(selectedOrder.fulfillmentStatus)}
                        </span>
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(selectedOrder.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                          Products Ordered
                        </h4>
                        <span className="text-xs text-gray-500">
                          {selectedOrder.items?.length || 0} item{(selectedOrder.items?.length || 0) === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                              <th className="pb-2 pr-3">Product</th>
                              <th className="pb-2 pr-3">Qty</th>
                              <th className="pb-2 pr-3">Unit Price</th>
                              <th className="pb-2 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedOrder.items || []).map((item, index) => (
                              <tr key={`${selectedOrder._id}-${item.productId || index}`} className="border-b border-gray-100 last:border-b-0">
                                <td className="py-3 pr-3 font-medium text-gray-900">{item.name}</td>
                                <td className="py-3 pr-3 text-gray-700">{item.quantity}</td>
                                <td className="py-3 pr-3 text-gray-700">{formatCurrency(item.unitPrice)}</td>
                                <td className="py-3 text-right font-semibold text-gray-900">
                                  {formatCurrency(item.lineTotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mb-6 grid gap-4 rounded-xl bg-gray-50 p-4 lg:grid-cols-2">
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                            Shipping Address
                          </h4>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyShippingLabel(selectedOrder)}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-white"
                            >
                              Copy A4 Label
                            </button>
                            <button
                              type="button"
                              onClick={() => printShippingLabel(selectedOrder)}
                              className="rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800"
                            >
                              Print A4 Label
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-700">
                          <p className="font-medium">{selectedOrder.shippingAddress?.name}</p>
                          <p>{selectedOrder.shippingAddress?.phone}</p>
                          <p>{selectedOrder.shippingAddress?.email}</p>
                          <p>{selectedOrder.shippingAddress?.address}</p>
                          <p>
                            {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} -{" "}
                            {selectedOrder.shippingAddress?.pincode}
                          </p>
                        </div>
                        <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            A4 Sticker Print Format
                          </p>
                          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-800">
                            {formatShippingLabel(selectedOrder)}
                          </pre>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                            Billing Address
                          </h4>
                          <button
                            type="button"
                            onClick={() => copyOrderAddress(selectedOrder)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-white"
                          >
                            Copy Address Details
                          </button>
                        </div>
                        <div className="space-y-1 text-sm text-gray-700">
                          <p className="font-medium">{selectedOrder.billingAddress?.name}</p>
                          <p>{selectedOrder.billingAddress?.phone}</p>
                          <p>{selectedOrder.billingAddress?.email}</p>
                          <p>{selectedOrder.billingAddress?.address}</p>
                          <p>
                            {selectedOrder.billingAddress?.city}, {selectedOrder.billingAddress?.state} -{" "}
                            {selectedOrder.billingAddress?.pincode}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <select
                        value={draft.fulfillmentStatus}
                        onChange={(e) =>
                          updateOrderDraft(selectedOrder._id, "fulfillmentStatus", e.target.value)
                        }
                        className="rounded-lg border border-gray-300 p-3"
                      >
                        <option value="processing">Processing</option>
                        <option value="packed">Packed</option>
                        <option value="shipped">Shipped</option>
                        <option value="out_for_delivery">Out for delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <input
                        value={draft.courierName}
                        onChange={(e) =>
                          updateOrderDraft(selectedOrder._id, "courierName", e.target.value)
                        }
                        placeholder="Courier name"
                        className="rounded-lg border border-gray-300 p-3"
                      />

                      <input
                        value={draft.trackingNumber}
                        onChange={(e) =>
                          updateOrderDraft(selectedOrder._id, "trackingNumber", e.target.value)
                        }
                        placeholder="Tracking number"
                        className="rounded-lg border border-gray-300 p-3"
                      />

                      <input
                        type="date"
                        value={draft.estimatedDelivery}
                        onChange={(e) =>
                          updateOrderDraft(selectedOrder._id, "estimatedDelivery", e.target.value)
                        }
                        className="rounded-lg border border-gray-300 p-3"
                      />

                      <input
                        value={draft.location}
                        onChange={(e) =>
                          updateOrderDraft(selectedOrder._id, "location", e.target.value)
                        }
                        placeholder="Current location"
                        className="rounded-lg border border-gray-300 p-3"
                      />

                      <input
                        value={draft.note}
                        onChange={(e) => updateOrderDraft(selectedOrder._id, "note", e.target.value)}
                        placeholder="Customer-facing update note"
                        className="rounded-lg border border-gray-300 p-3"
                      />
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={() => updateOrderTracking(selectedOrder._id)}
                        className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white"
                      >
                        Save Tracking Update
                      </button>
                    </div>
                  </>
                );
              })()}
            </section>
          ) : null}
        </section>
      ) : adminView === "analytics" ? (
        <section className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Traffic Analytics</h2>
                <p className="text-sm text-gray-600">
                  Live site traffic overview from your own website visits data in one cleaner dashboard.
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
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-medium text-gray-500">Total Page Views</p>
                <p className="mt-2 text-3xl font-bold">
                  {trafficLoading ? "..." : trafficSummary?.totalPageViews ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-medium text-gray-500">Today&apos;s Page Views</p>
                <p className="mt-2 text-3xl font-bold">
                  {trafficLoading ? "..." : trafficSummary?.todayPageViews ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-medium text-gray-500">Unique Visitors</p>
                <p className="mt-2 text-3xl font-bold">
                  {trafficLoading ? "..." : trafficSummary?.totalUniqueVisitors ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-medium text-gray-500">Today&apos;s Unique Visitors</p>
                <p className="mt-2 text-3xl font-bold">
                  {trafficLoading ? "..." : trafficSummary?.todayUniqueVisitors ?? 0}
                </p>
              </div>
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
                          className="h-full rounded-full bg-emerald-600"
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
      ) : (
        <>
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
          <label className="block rounded border border-dashed border-gray-300 p-3 text-sm text-gray-700">
            <span className="mb-2 block font-medium">Upload main product image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePrimaryImageUpload}
              className="w-full"
            />
            <span className="mt-2 block text-xs text-gray-500">
              {imageUploading
                ? "Uploading image..."
                : "Select an image from this device. The uploaded path will be filled automatically."}
            </span>
          </label>
          <textarea
            placeholder="Extra Image URLs (one per line)"
            className="w-full border p-2"
            value={extraImages}
            onChange={(e) => setExtraImages(e.target.value)}
            rows={4}
          />
          <label className="block rounded border border-dashed border-gray-300 p-3 text-sm text-gray-700">
            <span className="mb-2 block font-medium">Upload extra product images</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleExtraImagesUpload}
              className="w-full"
            />
            <span className="mt-2 block text-xs text-gray-500">
              {extraImagesUploading
                ? "Uploading extra images..."
                : "Choose one or more images. Their uploaded paths will be added automatically."}
            </span>
          </label>
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

        <div className="mt-10 rounded-2xl bg-white p-6 shadow">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-bold">Products List</h2>
              <p className="text-sm text-gray-600">
                {filteredProducts.length} matching products • Page {safeCurrentProductPage} of {totalProductPages}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
                In stock
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">
                Low stock
              </span>
              <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">
                Out of stock
              </span>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products..."
              className="rounded border border-gray-300 bg-white p-3 text-black shadow-sm"
            />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="rounded border border-gray-300 bg-white p-3 capitalize text-black shadow-sm"
            >
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as "all" | "in" | "low" | "out")}
              className="rounded border border-gray-300 bg-white p-3 text-black shadow-sm"
            >
              <option value="all">All stock levels</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
            <select
              value={promotionFilter}
              onChange={(e) => setPromotionFilter(e.target.value as "all" | "featured" | "flash")}
              className="rounded border border-gray-300 bg-white p-3 text-black shadow-sm"
            >
              <option value="all">All promotions</option>
              <option value="featured">Featured only</option>
              <option value="flash">Flash sale only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3">Flash Sale</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((p) => (
                  <tr key={p._id} className="align-top transition hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{p._id}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-700">{p.category || "-"}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-gray-900">{p.stock}</span>
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getStockBadgeClasses(
                            Number(p.stock || 0)
                          )}`}
                        >
                          {getStockLabel(Number(p.stock || 0))}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {p.weightGrams ? `${p.weightGrams}g` : "Not set"}
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(p.featured)}
                          onChange={(e) => handleFeaturedToggle(p._id, e.target.checked)}
                        />
                        <span className="text-xs font-medium text-gray-700">Featured</span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
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
                        <span className="text-xs font-medium text-gray-700">Flash sale</span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
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
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-black"
                          title="Flash sale discount percentage"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p._id)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">
                    No products match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Showing {paginatedProducts.length === 0 ? 0 : (safeCurrentProductPage - 1) * PRODUCTS_PER_PAGE + 1}
            {" "}to{" "}
            {(safeCurrentProductPage - 1) * PRODUCTS_PER_PAGE + paginatedProducts.length}
            {" "}of {filteredProducts.length} products
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentProductPage((prev) => Math.max(prev - 1, 1))}
              disabled={safeCurrentProductPage === 1}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
              {safeCurrentProductPage} / {totalProductPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentProductPage((prev) => Math.min(prev + 1, totalProductPages))
              }
              disabled={safeCurrentProductPage === totalProductPages}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      </>
      )}
    </main>
  );
}



