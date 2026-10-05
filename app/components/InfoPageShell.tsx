import Link from "next/link";

type InfoPageShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export default function InfoPageShell({
  title,
  subtitle,
  children,
}: InfoPageShellProps) {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 text-black sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 text-sm text-gray-600">
          <Link href="/" className="hover:text-black">
            Home
          </Link>
          <span className="mx-2">{">"}</span>
          <span className="text-gray-800">{title}</span>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{title}</h1>
          <p className="mt-3 text-base text-gray-600 sm:text-lg">{subtitle}</p>
          <div className="mt-8 space-y-6 text-gray-700">{children}</div>
        </section>
      </div>
    </main>
  );
}
