"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import "@/lib/meta-pixel";

export default function MetaPixelPageView() {
  const pathname = usePathname();
  const isInitialPage = useRef(true);

  useEffect(() => {
    if (isInitialPage.current) {
      isInitialPage.current = false;
      return;
    }

    window.fbq?.("track", "PageView");
  }, [pathname]);

  return null;
}
