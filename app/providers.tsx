"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import Link from "next/link";

function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-black text-white">
      <Link href="/" className="text-xl font-bold">
        CrazyAudios
      </Link>

      <div className="space-x-6">
        <Link href="/">Home</Link>
        <Link href="/cart">Cart</Link>

        {!session && (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}

        {session && (
          <>
            {session.user?.role === "admin" && (
              <Link href="/admin">Admin</Link>
            )}
            <button onClick={() => signOut()}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Navbar />
      {children}
    </SessionProvider>
  );
}
