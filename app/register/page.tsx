import type { Metadata } from "next";
import { AuthShell } from "@/app/components/content/AuthShell";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a CrazyAudios account to see your orders and invoices in one place.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create an account"
      subtitle="See your orders and invoices in one place."
      note="An account is optional: you can always check out as a guest. Orders you place while signed in appear under My orders."
    >
      <RegisterForm />
    </AuthShell>
  );
}
