"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * next-auth's SessionProvider for the few routes whose client components call
 * useSession() (today: checkout). The root layout deliberately has none: it
 * fetched /api/auth/session on every page load and tab focus, and shipped
 * next-auth's client with every page. Use it from a route's layout.tsx:
 *
 *   export default function Layout({ children }) { return <SessionScope>{children}</SessionScope>; }
 */
export function SessionScope({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
