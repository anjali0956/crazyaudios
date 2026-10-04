import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Keep /api/uploads (product images) and /api/meta-feed crawlable: Facebook's
// crawler honours robots.txt for link previews and the catalog feed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/admin",
          "/cart",
          "/checkout",
          "/my-account",
          "/orders",
          "/login",
          "/register",
          "/preview",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
