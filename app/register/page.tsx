"use client";
import { useState } from "react";
import Link from "next/link";
import axios from "axios";

function inputValue(form: HTMLFormElement, id: string, fallback: string) {
  const input = form.elements.namedItem(id);
  return input instanceof HTMLInputElement ? input.value : fallback;
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read the inputs themselves: text typed or autofilled before the page
    // finished loading never reaches React state. (ids, not names, so a submit
    // before hydration can't put the password in the URL.)
    const form = e.currentTarget;
    const values = {
      name: inputValue(form, "register-name", name),
      email: inputValue(form, "register-email", email),
      password: inputValue(form, "register-password", password),
    };
    setName(values.name);
    setEmail(values.email);
    setPassword(values.password);
    setError("");
    setSuccess(false);
    setSubmitting(true);

    try {
      await axios.post("/api/register", values);

      setSuccess(true);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(
        (axios.isAxiosError(err) && err.response?.data?.error) ||
          "Registration failed. Please try again."
      );
    } finally {
      setSubmitting(false);
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
          id="register-name"
          placeholder="Name"
          className="w-full border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />

        <input
          type="email"
          id="register-email"
          placeholder="Email"
          className="w-full border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <input
          type="password"
          id="register-password"
          placeholder="Password (at least 8 characters)"
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />

        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="text-sm text-green-700">
            Account created. You can{" "}
            <Link href="/login" className="font-semibold underline">
              sign in
            </Link>{" "}
            now.
          </p>
        ) : null}

        <button
          className="w-full bg-black text-white py-2 rounded disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? "Creating account…" : "Register"}
        </button>
      </form>
    </main>
  );
}
