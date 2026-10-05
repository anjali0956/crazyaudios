import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import InfoPageShell from "@/app/components/InfoPageShell";
import { OrderCard } from "@/app/components/content/OrderCard";
import { SignOutButton } from "@/app/components/content/SignOutButton";
import { WhatsAppLink } from "@/app/components/chrome/TrackedLink";
import { WHATSAPP_DISPLAY } from "@/app/components/chrome/links";
import { IconArrowRight, IconBag, IconPackage, IconTruck, IconWhatsApp } from "@/app/components/icons";
import { ButtonLink } from "@/app/components/ui/Button";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { CONFIRMED_ORDER_STATUSES } from "@/lib/order-utils";
import { orderInvoicePath, ownedOrdersFilter } from "@/lib/order-access";
import { pluralize } from "@/lib/format";
import { whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "My account",
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

const RECENT_ORDERS = 3;

const tileClass =
  "group flex min-h-[72px] items-center gap-3 rounded-card border border-line bg-card px-4 py-3 transition-colors duration-150 hover:border-line-strong hover:bg-paper";

function TileBody({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <>
      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink-2 group-hover:bg-card">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-5 text-ink">{title}</span>
        <span className="mt-0.5 block truncate text-[13px] leading-[18px] text-muted">{text}</span>
      </span>
      <IconArrowRight size={18} className="shrink-0 text-ink-2 transition-transform duration-150 group-hover:translate-x-0.5" />
    </>
  );
}

export default async function MyAccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/my-account");
  }

  await dbConnect();

  // Only orders placed while signed in to this account (see lib/order-access.ts).
  const owned = await ownedOrdersFilter(session.user);
  const orders = owned
    ? await Order.find({ ...owned, status: { $in: CONFIRMED_ORDER_STATUSES } })
        .sort({ createdAt: -1 })
        .lean<AccountOrder[]>()
    : [];
  const recent = orders.slice(0, RECENT_ORDERS);
  const firstName = String(session.user.name || "").trim().split(/\s+/)[0];

  return (
    <InfoPageShell
      kicker="Account"
      title={firstName ? `Hello, ${firstName}` : "My account"}
      crumbs={[{ label: "Home", href: "/" }, { label: "My account" }]}
      subtitle={
        <>
          Signed in as <span className="break-all font-semibold text-ink">{session.user.email}</span>
        </>
      }
    >
      <nav aria-label="Account shortcuts">
        <ul className="grid gap-3 sm:grid-cols-2">
          <li>
            <Link href="/orders" className={tileClass}>
              <TileBody
                icon={<IconPackage size={20} />}
                title="My orders"
                text={orders.length ? pluralize(orders.length, "order") : "No orders yet"}
              />
            </Link>
          </li>
          <li>
            <Link href="/track-your-order" className={tileClass}>
              <TileBody icon={<IconTruck size={20} />} title="Track an order" text="With a receipt number and email" />
            </Link>
          </li>
          <li>
            <Link href="/cart" className={tileClass}>
              <TileBody icon={<IconBag size={20} />} title="Cart" text="Review and check out" />
            </Link>
          </li>
          <li>
            <WhatsAppLink
              href={whatsappLink("Hi CrazyAudios, I need help with my account or an order.")}
              source="account"
              className={tileClass}
            >
              <TileBody icon={<IconWhatsApp size={20} className="text-whatsapp" />} title="WhatsApp support" text={`${WHATSAPP_DISPLAY} · messages only`} />
            </WhatsAppLink>
          </li>
        </ul>
      </nav>

      <section aria-labelledby="recent-orders">
        <div className="flex items-end justify-between gap-4">
          <h2 id="recent-orders" className="type-h2 text-ink">
            Recent orders
          </h2>
          {orders.length > RECENT_ORDERS ? (
            <Link
              href="/orders"
              className="group -mr-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-chip px-2 text-[14px] font-semibold text-ink hover:text-signal-ink"
            >
              All {orders.length} orders
              <IconArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </div>

        {recent.length === 0 ? (
          <div className="mt-4 rounded-card border border-line bg-card p-5 sm:p-6">
            <p className="text-[16px] font-semibold leading-6 text-ink">No orders on this account yet</p>
            <p className="mt-1 text-[15px] leading-[22px] text-ink-2">
              Orders you place while signed in appear here. Ordered as a guest? Find it with{" "}
              <Link href="/track-your-order" className="font-semibold text-signal-ink underline decoration-1 underline-offset-[3px]">
                Track your order
              </Link>
              .
            </p>
            <ButtonLink href="/category/amplifier-ics" variant="dark" className="mt-5">
              Shop amplifier ICs
            </ButtonLink>
          </div>
        ) : (
          <ol className="mt-4 space-y-4">
            {recent.map((order) => (
              <li key={order._id.toString()}>
                <OrderCard
                  compact
                  headingLevel="h3"
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
      </section>

      <div className="border-t border-line pt-8">
        <SignOutButton />
      </div>
    </InfoPageShell>
  );
}
