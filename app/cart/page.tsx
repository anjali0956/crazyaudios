"use client";
import { useEffect, useState } from "react";

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(storedCart);
  }, []);

  const removeItem = (id: string) => {
    const updatedCart = cart.filter((item) => item._id !== id);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setCart(updatedCart);
  };

  const total = cart.reduce(
  (sum, item) => sum + item.price * item.quantity,
  0
);


  return (
    <main className="min-h-screen bg-gray-100 p-10 text-black">
      <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

      {cart.length === 0 && <p>No items in cart.</p>}

      <div className="space-y-4">
        {cart.map((item) => (
          <div
            key={item._id}
            className="bg-white p-4 rounded shadow flex justify-between"
          >
            <div>
              <p className="font-semibold text-lg">{item.name}</p>
<p className="text-gray-300">
  ₹{item.price} × {item.quantity}
</p>

            </div>
            <button
              onClick={() => removeItem(item._id)}
              className="bg-red-600 text-white px-3 py-1 rounded"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="mt-8 text-xl font-bold">
          Total: ₹{total}
        </div>
      )}
    </main>
  );
}
