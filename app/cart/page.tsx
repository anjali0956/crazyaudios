import type { Metadata } from "next";
import { IconBag } from "@/app/components/icons";
import { ButtonLink } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { DepartmentLinks } from "@/app/components/chrome/DepartmentLinks";
import { CartView } from "./CartView";

export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  // Server-rendered so the empty state (and its department links) cost no client JS.
  const emptyState = (
    <EmptyState
      icon={<IconBag size={26} />}
      title="Your cart is empty"
      description="Parts you add to your cart will show up here."
      action={
        <>
          <ButtonLink href="/category/amplifier-ics" size="lg">
            Shop amplifier ICs
          </ButtonLink>
          <ButtonLink href="/category/transistors" size="lg" variant="outline">
            Shop transistors
          </ButtonLink>
        </>
      }
      className="py-10 lg:py-14"
    >
      <DepartmentLinks headingLevel="h3" className="mx-auto max-w-xl" />
    </EmptyState>
  );

  return (
    <main className="page-wrap pb-12 pt-4 lg:pb-16 lg:pt-8">
      <CartView emptyState={emptyState} />
    </main>
  );
}
