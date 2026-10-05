import type { Metadata } from "next";
import ProductNotFound from "./ProductNotFound";

// Rendered (with HTTP 404) when page.tsx calls notFound() for a product id
// that does not exist.
export const metadata: Metadata = {
  title: "Product not found",
  robots: { index: false },
};

export default function NotFound() {
  return <ProductNotFound />;
}
