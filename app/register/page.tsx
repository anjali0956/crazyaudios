"use client";
import { useState } from "react";
import axios from "axios";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e: any) => {
    e.preventDefault();

    try {
      await axios.post("/api/register", {
        name,
        email,
        password
      });

      alert("User Registered!");
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      alert("Registration failed");
    }
  };

  return (
    <main className="min-h-screen bg-gray-200 flex items-center justify-center">
      <form
        onSubmit={handleRegister}
        className="bg-white p-8 rounded-xl shadow-lg space-y-4 w-96 text-black"
      >
        <h1 className="text-2xl font-bold text-center">Register</h1>

        <input
          type="text"
          placeholder="Name"
          className="w-full border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="w-full bg-black text-white py-2 rounded">
          Register
        </button>
      </form>
    </main>
  );
}
