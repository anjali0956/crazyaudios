import type { NextConfig } from "next";

// Sent with every response. No CSP yet (the Meta Pixel and Razorpay need a
// carefully scoped policy); these are safe defaults for all routes.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    inlineCss: true,
  },
  images: {
    // Built-in optimiser: resizes product photos (/public and /api/uploads/<id>)
    // and serves AVIF/WebP; optimised variants are cached for 30 days.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
