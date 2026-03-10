"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
const [weight, setWeight] = useState("");
const [battery, setBattery] = useState("");
const [dimensions, setDimensions] = useState("");


  const fetchProducts = async () => {
    const res = await axios.get("/api/products");
    setProducts(res.data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    await axios.post("/api/products", {
      name,
      price: Number(price),
      image,
      stock: Number(stock),
      category,
      description: "Audio product",
specifications: {
  color,
  weight,
  battery,
  dimensions,
},
    });

    setName("");
    setPrice("");
    setImage("");
    setStock("");
    setCategory("");
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    await axios.delete("/api/products", {
      data: { id }
    });
    fetchProducts();
  };

  return (
    <main className="min-h-screen bg-gray-200 text-black p-10">
      
      <h1 className="text-3xl font-bold mb-8 text-black">
        Admin Panel
      </h1>

      {/* Add Product Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white text-black p-6 rounded-xl shadow-lg max-w-md space-y-4 mb-10"
      >
        <input
          type="text"
          placeholder="Product Name"
          className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-black text-black bg-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Price"
          className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-black text-black bg-white"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Image URL (/headphones.png)"
          className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-black text-black bg-white"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Stock"
          className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-black text-black bg-white"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          required
        />

        <input
  type="text"
  placeholder="Category (speaker / headphone)"
  className="w-full border p-2 rounded"
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  required
/>
        <input
  type="text"
  placeholder="Color"
  className="w-full border p-2 rounded"
  value={color}
  onChange={(e) => setColor(e.target.value)}
/>

<input
  type="text"
  placeholder="Weight"
  className="w-full border p-2 rounded"
  value={weight}
  onChange={(e) => setWeight(e.target.value)}
/>

<input
  type="text"
  placeholder="Battery Life"
  className="w-full border p-2 rounded"
  value={battery}
  onChange={(e) => setBattery(e.target.value)}
/>

<input
  type="text"
  placeholder="Dimensions"
  className="w-full border p-2 rounded"
  value={dimensions}
  onChange={(e) => setDimensions(e.target.value)}
/>


        <button className="w-full bg-black hover:bg-gray-800 text-white py-2 rounded transition">
          Add Product
        </button>
      </form>

      {/* Product List */}
      <div className="space-y-4">
        {products.map((product) => (
          <div
            key={product._id}
            className="bg-gray-800 text-white p-4 rounded-lg shadow flex justify-between items-center"
          >
            <div>
              <p className="font-semibold text-lg">{product.name}</p>
              <p className="text-gray-300">₹{product.price}</p>
            </div>

            <button
              onClick={() => handleDelete(product._id)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded transition"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

    </main>
  );
}
