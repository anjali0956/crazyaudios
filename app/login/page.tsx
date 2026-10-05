"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { safeCallbackPath } from "@/lib/safe-redirect";

function inputValue(form: HTMLFormElement, id: string, fallback: string) {
  const input = form.elements.namedItem(id);
  return input instanceof HTMLInputElement ? input.value : fallback;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read the inputs themselves: text typed or autofilled before the page
    // finished loading never reaches React state. (ids, not names, so a submit
    // before hydration can't put the password in the URL.)
    const formEmail = inputValue(e.currentTarget, "login-email", email).trim();
    const formPassword = inputValue(e.currentTarget, "login-password", password);
    setEmail(formEmail);
    setPassword(formPassword);
    setError("");
    setStatus("");
    setSubmitting(true);

    try {
      const res = await signIn("credentials", {
        email: formEmail,
        password: formPassword,
        redirect: false,
      });

      if (!res || res.error) {
        setError("Email or password is incorrect.");
        setSubmitting(false);
        return;
      }

      setStatus("Signed in. Taking you back…");
      // Read at submit time (no useSearchParams, so the page stays static).
      const target = safeCallbackPath(
        new URLSearchParams(window.location.search).get("callbackUrl"),
        window.location.origin
      );
      if (target.startsWith("/api/")) {
        // e.g. an invoice download: a full navigation, not a client-side route.
        window.location.assign(target);
        return;
      }
      router.push(target);
      router.refresh();
    } catch {
      setError("We couldn't sign you in right now. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-200 flex items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-lg space-y-4 w-96 text-black"
      >
        <h1 className="text-2xl font-bold text-center">Login</h1>

        <input
          type="email"
          id="login-email"
          placeholder="Email"
          className="w-full border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <input
          type="password"
          id="login-password"
          placeholder="Password"
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {status ? (
          <p role="status" className="text-sm text-green-700">
            {status}
          </p>
        ) : null}

        <button
          className="w-full bg-black text-white py-2 rounded disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Login"}
        </button>
      </form>
    </main>
  );
}
