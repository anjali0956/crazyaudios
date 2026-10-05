import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./my-loader.ts",
  },
};

export default nextConfig;
