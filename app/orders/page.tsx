import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import InfoPageShell from "@/app/components/InfoPageShell";
import { OrderCard } from "@/app/components/content/OrderCard";
import { IconPackage } from "@/app/components/icons";
import { ButtonLink } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { CONFIRMED_ORDER_STATUSES } from "@/lib/order-utils";
import { orderInvoicePath, ownedOrdersFilter } from "@/lib/order-access";

export const metadata: Metadata = {
  title: "My orders",
  robots: { index: false, follow: true },
};

type AccountOrder = {
  _id: { toString(): string };
  receipt: string;
  invoiceNumber: string;
  paymentMethod?: string;
  createdAt: Date;
  fulfillmentStatus?: string;
  estimatedDelivery?: Date | null;
  totalAmount: number;
  customerEmail: string;
  items: Array<{ productId: unknown; name: string; quantity: number; lineTotal: number; image?: string }>;
};

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/orders");
  }

  await dbConnect();

  // Only orders placed while signed in to this account (see lib/order-access.ts).
  const owned = await ownedOrdersFilter(session.user);
  const orders = owned
    ? await Order.find({ ...owned, status: { $in: CONFIRMED_ORDER_STATUSES } })
        .sort({ createdAt: -1 })
        .lean<AccountOrder[]>()
    : [];

  return (
    <InfoPageShell
      kicker="Account"
      title="My orders"
      subtitle="Orders you placed while signed in to this account, newest first."
      crumbs={[
        { label: "Home", href: "/" },
        { label: "My account", href: "/my-account" },
        { label: "My orders" },
      ]}
    >
      {orders.length === 0 ? (
        <EmptyState
          icon={<IconPackage />}
          title="No orders yet"
          description="Orders you place while signed in appear here. Ordered as a guest? Find it with Track your order."
          className="rounded-card border border-line bg-card"
          action={
            <>
              <ButtonLink href="/category/amplifier-ics" fullWidth className="sm:w-auto">
                Shop amplifier ICs
              </ButtonLink>
              <ButtonLink href="/track-your-order" variant="outline" fullWidth className="sm:w-auto">
                Track your order
              </ButtonLink>
            </>
          }
        />
      ) : (
        <ol className="space-y-4">
          {orders.map((order) => (
            <li key={order._id.toString()}>
              <OrderCard
                invoiceHref={orderInvoicePath(order)}
                order={{
                  id: order._id.toString(),
                  receipt: order.receipt,
                  invoiceNumber: order.invoiceNumber,
                  paymentMethod: order.paymentMethod,
                  createdAt: order.createdAt,
                  fulfillmentStatus: order.fulfillmentStatus,
                  estimatedDelivery: order.estimatedDelivery,
                  totalAmount: order.totalAmount,
                  customerEmail: order.customerEmail,
                  items: order.items,
                }}
              />
            </li>
          ))}
        </ol>
      )}

      {orders.length > 0 ? (
        <p className="text-[14px] leading-[21px] text-muted">
          Ordered as a guest? Guest orders don&apos;t appear here; find them with{" "}
          <Link href="/track-your-order" className="font-semibold text-ink underline decoration-1 underline-offset-[3px]">
            Track your order
          </Link>
          .
        </p>
      ) : null}
    </InfoPageShell>
  );
}
