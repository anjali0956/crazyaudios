"use client";

import { useEffect, useState } from "react";

export default function CheckoutPage() {
  const [cart, setCart] = useState<any[]>([]);

  // ✅ SHIPPING STATE
  const [shipping, setShipping] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  // ✅ BILLING STATE
  const [billing, setBilling] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [sameAsShipping, setSameAsShipping] = useState(false);

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(storedCart);
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // ✅ HANDLE CHECKBOX
  const handleSameAddress = (checked: boolean) => {
    setSameAsShipping(checked);

    if (checked) {
      setBilling(shipping);
    } else {
      setBilling({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
      });
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-black sm:p-6 lg:p-10">

      <h1 className="text-2xl font-bold mb-6 sm:text-3xl sm:mb-8">Checkout</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-10">

        {/* Customer Details */}
        <div className="bg-white p-4 rounded-lg shadow sm:p-6">

          <h2 className="text-xl font-semibold mb-4">
            Shipping Details
          </h2>

          <form className="space-y-4">

            {/* SHIPPING */}
            <input
              type="text"
              placeholder="Full Name"
              value={shipping.name}
              onChange={(e) =>
                setShipping({ ...shipping, name: e.target.value })
              }
              className="w-full min-h-11 border p-2 rounded"
              required
            />

            <input
              type="email"
              placeholder="Email Address"
              value={shipping.email}
              onChange={(e) =>
                setShipping({ ...shipping, email: e.target.value })
              }
              className="w-full min-h-11 border p-2 rounded"
              required
            />

            <input
              type="tel"
              placeholder="Phone Number"
              value={shipping.phone}
              onChange={(e) =>
                setShipping({ ...shipping, phone: e.target.value })
              }
              className="w-full min-h-11 border p-2 rounded"
              required
            />

            <textarea
              placeholder="Full Address"
              value={shipping.address}
              onChange={(e) =>
                setShipping({ ...shipping, address: e.target.value })
              }
              className="w-full border p-2 rounded"
              rows={3}
              required
            />

            <input
              type="text"
              placeholder="City"
              value={shipping.city}
              onChange={(e) =>
                setShipping({ ...shipping, city: e.target.value })
              }
              className="w-full min-h-11 border p-2 rounded"
            />

            <input
              type="text"
              placeholder="State"
              value={shipping.state}
              onChange={(e) =>
                setShipping({ ...shipping, state: e.target.value })
              }
              className="w-full min-h-11 border p-2 rounded"
            />

            <input
              type="text"
              placeholder="Pincode"
              value={shipping.pincode}
              onChange={(e) =>
                setShipping({ ...shipping, pincode: e.target.value })
              }
              className="w-full min-h-11 border p-2 rounded"
            />

            {/* ✅ CHECKBOX */}
            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                checked={sameAsShipping}
                onChange={(e) => handleSameAddress(e.target.checked)}
              />
              <label>Billing address same as shipping</label>
            </div>

            {/* ✅ BILLING SECTION */}
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4">
                Billing Details
              </h2>

              <div className="space-y-4">

                <input
                  type="text"
                  placeholder="Full Name"
                  value={billing.name}
                  onChange={(e) =>
                    setBilling({ ...billing, name: e.target.value })
                  }
                  disabled={sameAsShipping}
                  className="w-full min-h-11 border p-2 rounded"
                />

                <input
                  type="email"
                  placeholder="Email Address"
                  value={billing.email}
                  onChange={(e) =>
                    setBilling({ ...billing, email: e.target.value })
                  }
                  disabled={sameAsShipping}
                  className="w-full min-h-11 border p-2 rounded"
                />

                <input
                  type="text"
                  placeholder="Phone Number"
                  value={billing.phone}
                  onChange={(e) =>
                    setBilling({ ...billing, phone: e.target.value })
                  }
                  disabled={sameAsShipping}
                  className="w-full min-h-11 border p-2 rounded"
                />

                <textarea
                  placeholder="Full Address"
                  value={billing.address}
                  onChange={(e) =>
                    setBilling({ ...billing, address: e.target.value })
                  }
                  disabled={sameAsShipping}
                  className="w-full border p-2 rounded"
                />

                <input
                  type="text"
                  placeholder="City"
                  value={billing.city}
                  onChange={(e) =>
                    setBilling({ ...billing, city: e.target.value })
                  }
                  disabled={sameAsShipping}
                  className="w-full min-h-11 border p-2 rounded"
                />

                <input
                  type="text"
                  placeholder="State"
                  value={billing.state}
                  onChange={(e) =>
                    setBilling({ ...billing, state: e.target.value })
                  }
                  disabled={sameAsShipping}
                  className="w-full min-h-11 border p-2 rounded"
                />

                <input
                  type="text"
                  placeholder="Pincode"
                  value={billing.pincode}
                  onChange={(e) =>
                    setBilling({ ...billing, pincode: e.target.value })
                  }
                  disabled={sameAsShipping}
                  className="w-full min-h-11 border p-2 rounded"
                />

              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded-lg mt-6"
            >
              Continue to Payment
            </button>

          </form>

        </div>

        {/* Order Summary */}
        <div className="bg-white p-4 rounded-lg shadow sm:p-6">

          <h2 className="text-xl font-semibold mb-4">
            Order Summary
          </h2>

          {cart.map((item) => (
            <div
              key={item._id}
              className="flex gap-4 justify-between border-b py-2 text-sm sm:text-base"
            >
              <span>
                {item.name} × {item.quantity}
              </span>

              <span>
                ₹{item.price * item.quantity}
              </span>
            </div>
          ))}

          <div className="flex justify-between mt-4 text-lg font-semibold">
            <span>Total</span>
            <span>₹{total}</span>
          </div>

        </div>

      </div>

    </main>
  );
}
