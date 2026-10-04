import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import dbConnect from "@/lib/mongodb";
import { findOrderByIdAndReceipt, orderInvoicePath } from "@/lib/order-access";
import { CONFIRMED_ORDER_STATUSES } from "@/lib/order-utils";
import { displayName } from "@/lib/display";
import { formatINR, formatNumber } from "@/lib/format";
import { whatsappLink } from "@/lib/site";
import { SUPPORT_HOURS } from "@/app/components/chrome/links";
import { WhatsAppLink } from "@/app/components/chrome/TrackedLink";
import { formatIndiaDate } from "@/app/components/checkout/format";
import { OrderTotals } from "@/app/components/checkout/OrderTotals";
import {
  IconAlert,
  IconArrowRight,
  IconCash,
  IconCheckCircle,
  IconClock,
  IconMapPin,
  IconPackage,
  IconReceipt,
  IconRefresh,
  IconTruck,
  IconWhatsApp,
} from "@/app/components/icons";
import { ButtonAnchor, ButtonLink, buttonClasses } from "@/app/components/ui/Button";
import { ProductImage } from "@/app/components/ui/ProductImage";
import { cx } from "@/app/components/ui/cx";
import PurchaseTracker from "./PurchaseTracker";
import { OrderPageEffects } from "./OrderPageEffects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

type OrderItem = { productId?: unknown; name?: string; image?: string; unitPrice?: number; quantity?: number; lineTotal?: number };

type SuccessOrder = {
  _id: unknown;
  receipt: string;
  status: string;
  paymentMethod?: string;
  totalAmount: number;
  subtotal?: number;
  shippingFee?: number;
  codFee?: number;
  taxAmount?: number;
  customerEmail?: string;
  customerName?: string;
  stockDeducted?: boolean;
  courierName?: string;
  estimatedDelivery?: Date | string | null;
  createdAt?: Date | string;
  items?: OrderItem[];
  shippingAddress?: { name?: string; address?: string; city?: string; state?: string; pincode?: string };
};

// The order is read on the server; the id and receipt in the URL must both
// match, so the page never trusts query parameters for status or amounts.
async function loadOrder(orderId?: string, receipt?: string) {
  if (!orderId || !receipt) return null;
  try {
    await dbConnect();
    return (await findOrderByIdAndReceipt(orderId, receipt)) as SuccessOrder | null;
  } catch (error) {
    console.error("[checkout/success] Order lookup failed:", error);
    return null;
  }
}

function firstName(value?: string) {
  const first = String(value || "").trim().split(/\s+/)[0] || "";
  return first.length > 1 && first.length <= 24 ? first : "";
}

function Card({ title, icon, children, className }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-card border border-line bg-card p-4 sm:p-5", className)}>
      <h2 className="flex items-center gap-2 type-kicker text-muted">
        {icon}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; receipt?: string; method?: string }>;
}) {
  const params = await searchParams;
  const order = await loadOrder(params.order, params.receipt);

  if (!order) {
    return (
      <main className="page-wrap pb-16 pt-8 lg:pt-12">
        <div className="mx-auto max-w-[560px] rounded-card border border-line bg-card p-6 text-center sm:p-8">
          <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-signal-soft text-signal-ink">
            <IconReceipt size={26} />
          </span>
          <h1 className="type-h2 mt-4 text-ink">We couldn&apos;t find that order</h1>
          <p className="mt-2 text-[15px] leading-[22px] text-ink-2">
            Please use the link from your order confirmation, or look the order up with your receipt number and email.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <ButtonLink href="/track-your-order" variant="dark" size="lg">
              Track your order
            </ButtonLink>
            <WhatsAppLink
              href={whatsappLink("Hi CrazyAudios, I need help finding my order.")}
              source="order_success"
              className={buttonClasses({ variant: "outline", size: "lg" })}
            >
              <IconWhatsApp size={20} className="text-whatsapp" />
              Ask on WhatsApp
            </WhatsAppLink>
          </div>
        </div>
      </main>
    );
  }

  const orderId = String(order._id);
  const isCod = order.status === "cod";
  const isPaid = order.status === "paid";
  const isConfirmed = CONFIRMED_ORDER_STATUSES.includes(order.status);
  const isPending = order.status === "created";
  const name = firstName(order.customerName || order.shippingAddress?.name);
  const amount = formatINR(order.totalAmount);
  const pagePath = `/checkout/success?order=${encodeURIComponent(orderId)}&receipt=${encodeURIComponent(order.receipt)}`;
  const trackHref = `/track-your-order?receipt=${encodeURIComponent(order.receipt)}&email=${encodeURIComponent(order.customerEmail || "")}`;
  const helpHref = whatsappLink(`Hi CrazyAudios, I have a question about my order ${order.receipt}.`);
  const placedOn = formatIndiaDate(order.createdAt);
  const eta = formatIndiaDate(order.estimatedDelivery);
  const items = Array.isArray(order.items) ? order.items : [];
  const units = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const codFee = Number(order.codFee) || 0;
  const address = order.shippingAddress;

  let kicker: string;
  let heading: string;
  let message: ReactNode;
  if (isConfirmed) {
    kicker = isCod ? "Order confirmed · Cash on Delivery" : "Payment received · Order confirmed";
    heading = name ? `Thank you, ${name}. Your order is confirmed.` : "Thank you. Your order is confirmed.";
    message = isCod
      ? "We'll pack it and send it on its way. You pay the courier when it arrives."
      : `We've received your payment of ${amount}. We'll pack your order and send it on its way.`;
  } else if (isPending) {
    kicker = "Online payment";
    heading = "Payment received, confirming…";
    message =
      "We're waiting for the final confirmation from Razorpay. This usually takes under a minute, and this page updates by itself. Please don't pay again.";
  } else {
    kicker = "Payment not confirmed";
    heading = "We couldn't confirm this payment";
    message =
      "If money was taken from your account, message us on WhatsApp with your receipt number and we'll sort it out.";
  }

  return (
    <main className="page-wrap pb-16 pt-6 lg:pt-10">
      {isConfirmed ? <PurchaseTracker orderId={orderId} /> : null}
      <OrderPageEffects orderId={orderId} clearCart={isConfirmed || isPending} autoRefresh={isPending} />

      <div className="mx-auto max-w-[720px]">
        <header className="flex items-start gap-3 sm:gap-4">
          <span
            aria-hidden="true"
            className={cx(
              "grid h-11 w-11 shrink-0 place-items-center rounded-full sm:h-12 sm:w-12",
              isConfirmed ? "bg-ok-soft text-ok" : isPending ? "bg-signal-soft text-signal-ink" : "bg-danger-soft text-danger"
            )}
          >
            {isConfirmed ? <IconCheckCircle size={26} /> : isPending ? <IconClock size={26} /> : <IconAlert size={26} />}
          </span>
          <div className="min-w-0">
            <p className={cx("type-kicker", isConfirmed ? "text-ok" : isPending ? "text-signal-ink" : "text-danger")}>{kicker}</p>
            <h1 className="type-h1 mt-1 text-ink">{heading}</h1>
            <p className="mt-2 text-[15px] leading-[22px] text-ink-2">{message}</p>
            {isPaid && order.stockDeducted === false ? (
              <p className="mt-2 text-[15px] leading-[22px] text-ink-2">
                We&apos;re double-checking stock for one of your items and will contact you shortly.
              </p>
            ) : null}
            {isPending ? (
              <a
                href={pagePath}
                className={cx(buttonClasses({ variant: "outline", size: "md" }), "mt-4")}
              >
                <IconRefresh size={18} />
                Refresh
              </a>
            ) : null}
          </div>
        </header>

        {isCod ? (
          <div className="mt-6 flex items-center gap-3 rounded-card border border-signal/30 bg-signal-soft px-4 py-4 sm:gap-4 sm:px-5">
            <IconCash size={28} className="shrink-0 text-signal-ink" />
            <div>
              <p className="type-price text-[22px] leading-7 text-ink">Keep {amount} ready</p>
              <p className="text-[14px] leading-5 text-ink-2">Pay in cash when your parcel arrives.</p>
            </div>
          </div>
        ) : null}

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line text-[14px] leading-5">
          <div className="bg-card px-4 py-3">
            <dt className="text-muted">Receipt</dt>
            <dd className="mt-0.5 break-all font-mono text-[14px] font-medium text-ink">{order.receipt}</dd>
          </div>
          <div className="bg-card px-4 py-3">
            <dt className="text-muted">{isCod ? "Pay on delivery" : isPaid ? "Amount paid" : "Order total"}</dt>
            <dd className="type-price mt-0.5 text-[16px] text-ink">{amount}</dd>
          </div>
          {placedOn ? (
            <div className="bg-card px-4 py-3">
              <dt className="text-muted">Placed on</dt>
              <dd className="mt-0.5 text-ink">{placedOn}</dd>
            </div>
          ) : null}
          <div className="bg-card px-4 py-3">
            <dt className="text-muted">Payment</dt>
            <dd className="mt-0.5 text-ink">{isCod ? "Cash on Delivery" : "Online (Razorpay)"}</dd>
          </div>
        </dl>

        {isConfirmed || isPending ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {address ? (
              <Card title="Delivering to" icon={<IconMapPin size={16} />}>
                <p className="text-[15px] font-semibold leading-[22px] text-ink">{address.name}</p>
                <p className="text-[14px] leading-5 text-ink-2">{address.address}</p>
                <p className="text-[14px] leading-5 text-ink-2">
                  {[address.city, address.state].filter(Boolean).join(", ")} <span className="font-mono">{address.pincode}</span>
                </p>
              </Card>
            ) : null}
            <Card title="Delivery" icon={<IconTruck size={16} />}>
              {eta ? (
                <p className="text-[15px] font-semibold leading-[22px] text-ink">Expected by {eta}</p>
              ) : (
                <p className="text-[15px] font-semibold leading-[22px] text-ink">Usually 3–6 days</p>
              )}
              {order.courierName ? <p className="text-[14px] leading-5 text-ink-2">{order.courierName}</p> : null}
              <p className="mt-2 text-[13px] leading-[18px] text-muted">
                Most orders ship the same day when placed before 2 PM, Mon–Sat.
              </p>
            </Card>
          </div>
        ) : null}

        {items.length ? (
          <Card title={`Items · ${formatNumber(units)}`} icon={<IconPackage size={16} />} className="mt-4">
            <ul className="divide-y divide-line">
              {items.map((item, index) => {
                const itemName = displayName(String(item.name || ""));
                return (
                  <li key={`${String(item.productId)}-${index}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-chip border border-line bg-card">
                      <ProductImage src={item.image} alt={itemName} fill sizes="48px" className="object-contain p-1" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[14px] font-medium leading-5 text-ink">{itemName}</p>
                      <p className="text-[12.5px] leading-4 text-muted tabular">
                        {formatNumber(Number(item.quantity) || 0)} × {formatINR(Number(item.unitPrice) || 0)}
                      </p>
                    </div>
                    <p className="type-price shrink-0 text-[14px] text-ink">{formatINR(Number(item.lineTotal) || 0)}</p>
                  </li>
                );
              })}
            </ul>
            <OrderTotals
              itemsTotal={Number(order.subtotal) || 0}
              shipping={Number(order.shippingFee) || 0}
              shippingLabel={order.courierName ? `Shipping · ${order.courierName}` : "Shipping"}
              codFee={codFee > 0 ? codFee : null}
              total={order.totalAmount}
              totalLabel={isCod ? "To pay on delivery" : "Total"}
              gst={Number(order.taxAmount) || null}
              className="mt-4 border-t border-line pt-3"
            />
          </Card>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ButtonLink href={trackHref} variant="dark" size="lg" icon={<IconTruck size={20} />}>
            Track your order
          </ButtonLink>
          {isConfirmed ? (
            <ButtonAnchor href={orderInvoicePath(order)} variant="outline" size="lg" icon={<IconReceipt size={20} />}>
              Download invoice (PDF)
            </ButtonAnchor>
          ) : null}
          <WhatsAppLink href={helpHref} source="order_success" className={buttonClasses({ variant: "outline", size: "lg" })}>
            <IconWhatsApp size={20} className="text-whatsapp" />
            Help on WhatsApp
          </WhatsAppLink>
        </div>
        <p className="mt-3 text-[13px] leading-[18px] text-muted">
          WhatsApp replies {SUPPORT_HOURS}. Mention your receipt number {order.receipt}.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink hover:text-signal-ink"
        >
          Continue shopping
          <IconArrowRight size={18} />
        </Link>
      </div>
    </main>
  );
}
