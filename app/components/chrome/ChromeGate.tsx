"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// The preview password gate shows no store chrome (it renders its own screen).
const HIDE_ON = [/^\/preview(\/|$)/];

/** Renders the global header/footer except on pages that must stand alone. */
export function ChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  if (HIDE_ON.some((pattern) => pattern.test(pathname))) return null;
  return <>{children}</>;
}
