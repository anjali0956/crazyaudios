"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type PreviewAccessClientProps = {
  nextPath: string;
};

export default function PreviewAccessClient({
  nextPath,
}: PreviewAccessClientProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/preview-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          next: nextPath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Access could not be granted");
        return;
      }

      router.replace(data?.next || "/");
      router.refresh();
    } catch {
      setError("Something went wrong while unlocking preview access");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-10 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-orange-400">
          Private Preview
        </p>
        <h1 className="text-3xl font-bold">CrazyAudios is currently locked</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Enter the shared preview password to access the website. This gate is
          active for the full site, including the admin panel.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="preview-password"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Shared preview password
            </label>
            <input
              id="preview-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-orange-400"
              placeholder="Enter password"
              autoFocus
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || password.trim() === ""}
            className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Unlocking..." : "Enter Website"}
          </button>
        </form>
      </div>
    </main>
  );
}
