"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { captureAttributionFromUrl } from "@/lib/attribution";

// Remembers the ad/campaign a visitor arrived from (utm_* and fbclid) so the
// order can record it at checkout.
export default function AttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    captureAttributionFromUrl();
  }, [pathname]);

  return null;
}
