import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/app/components/content/AuthShell";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to see your CrazyAudios orders and download invoices.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Log in"
      subtitle="See your orders and download invoices."
      note={
        <>
          You don&apos;t need an account to order: checkout works as a guest. To check an order, use{" "}
          <Link href="/track-your-order" className="font-semibold text-ink underline decoration-1 underline-offset-[3px] hover:decoration-2">
            Track your order
          </Link>{" "}
          with your receipt number and email.
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
