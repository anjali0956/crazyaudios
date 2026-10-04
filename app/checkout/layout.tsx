import type { ReactNode } from "react";
import { SessionScope } from "@/app/components/SessionScope";

// CheckoutView calls useSession() (the "Have an account? Log in" hint), and the
// root layout no longer has a SessionProvider (it fetched the session on every
// page). Scoped here, checkout keeps its old behaviour and only checkout pays
// for it. No DOM element around {children} (see FOUNDATION_API rule 1).
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <SessionScope>{children}</SessionScope>;
}
