import Link from "next/link";

// Missing or invalid product id. Built from the category page's existing
// header ("Back to Home" button) and empty-state message styles.
export default function ProductNotFound() {
  return (
    <main className="min-h-screen bg-gray-100 text-black p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">Product not found</h1>
          <Link href="/" className="w-fit px-4 py-2 rounded bg-black text-white text-sm">
            Back to Home
          </Link>
        </div>
        <p className="text-gray-600">This product may have been removed, or the link may be wrong.</p>
      </div>
    </main>
  );
}
