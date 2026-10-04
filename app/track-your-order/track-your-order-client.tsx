"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import {
  OrderStatusChip,
  formatOrderAmount,
  formatOrderDate,
  formatOrderDateTime,
  normalizeStatus,
  paymentLabel,
  statusLabel,
  totalCaption,
  type FulfillmentStatus,
} from "@/app/components/content/order-display";
import { OrderItemThumb } from "@/app/components/content/OrderItemThumb";
import { IconAlert, IconCheck, IconClose, IconReceipt, IconSearch } from "@/app/components/icons";
import { Button, ButtonAnchor } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Field";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";
import { cx } from "@/app/components/ui/cx";
import { displayName } from "@/lib/display";

type TrackingEvent = {
  status: string;
  title: string;
  description?: string;
  location?: string;
  createdAt: string;
};

type TrackingOrder = {
  receipt: string;
  invoiceNumber: string;
  // Signed link: opens the invoice without signing in.
  invoiceUrl?: string;
  paymentMethod?: "prepaid" | "cod";
  fulfillmentStatus: string;
  courierName: string;
  trackingNumber: string;
  estimatedDelivery: string | null;
  trackingTimeline: TrackingEvent[];
  shippingAddress: {
    city: string;
    state: string;
    pincode: string;
  };
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    image?: string;
    lineTotal?: number;
  }>;
};

type Props = {
  initialReceipt: string;
  initialEmail: string;
};

// The admin adds this note when it leaves the field empty; it means nothing to a customer.
const ADMIN_DEFAULT_NOTE = "Shipment updated by admin.";

const STAGES: FulfillmentStatus[] = ["processing", "packed", "shipped", "out_for_delivery", "delivered"];

const STAGE_COPY: Record<FulfillmentStatus, string> = {
  processing: "We have your order and are getting it ready.",
  packed: "Packed and waiting for the courier.",
  shipped: "With the courier and on its way to you.",
  out_for_delivery: "Out with the courier for delivery.",
  delivered: "Delivered to your address.",
  completed: "Delivered to your address.",
  cancelled: "This order was cancelled.",
};

const HEADLINES: Record<FulfillmentStatus, string> = {
  processing: "We're preparing your order",
  packed: "Packed and ready to ship",
  shipped: "Your order is on its way",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  completed: "Delivered",
  cancelled: "This order was cancelled",
};

function inputValue(form: HTMLFormElement, name: string, fallback: string) {
  const input = form.elements.namedItem(name);
  return input instanceof HTMLInputElement ? input.value : fallback;
}

function latestEvent(events: TrackingEvent[], status: string) {
  let found: TrackingEvent | null = null;
  for (const event of events) {
    if (event.status !== status) continue;
    if (!found || new Date(event.createdAt).getTime() >= new Date(found.createdAt).getTime()) found = event;
  }
  return found;
}

type Step = {
  key: string;
  label: string;
  state: "done" | "current" | "upcoming" | "cancelled";
  event: TrackingEvent | null;
  copy?: string;
};

function buildSteps(order: TrackingOrder): Step[] {
  const status = normalizeStatus(order.fulfillmentStatus);
  const events = order.trackingTimeline || [];

  if (status === "cancelled") {
    // Show the stages the order reached before it was cancelled, then the cancellation.
    const reached = Math.max(0, ...events.map((event) => STAGES.indexOf(normalizeStatus(event.status))));
    const steps: Step[] = STAGES.slice(0, reached + 1).map((stage) => ({
      key: stage,
      label: statusLabel(stage),
      state: "done",
      event: latestEvent(events, stage),
    }));
    steps.push({
      key: "cancelled",
      label: "Cancelled",
      state: "cancelled",
      event: latestEvent(events, "cancelled"),
      copy: STAGE_COPY.cancelled,
    });
    return steps;
  }

  const current = status === "completed" ? STAGES.length - 1 : STAGES.indexOf(status);
  const finished = status === "delivered" || status === "completed";
  return STAGES.map((stage, index) => {
    const state: Step["state"] = index < current || (finished && index === current) ? "done" : index === current ? "current" : "upcoming";
    return {
      key: stage,
      label: statusLabel(stage),
      state,
      event: latestEvent(events, stage) || (stage === "delivered" ? latestEvent(events, "completed") : null),
      copy: state === "current" ? STAGE_COPY[stage] : undefined,
    };
  });
}

function StepMarker({ state }: { state: Step["state"] }) {
  if (state === "done") {
    return (
      <span className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-white">
        <IconCheck size={14} strokeWidth={3} />
      </span>
    );
  }
  if (state === "cancelled") {
    return (
      <span className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-danger text-white">
        <IconClose size={14} strokeWidth={3} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-signal-ink bg-card">
        <span className="h-2.5 w-2.5 rounded-full bg-signal" />
      </span>
    );
  }
  return <span className="relative z-10 h-6 w-6 shrink-0 rounded-full border-2 border-line-strong bg-card" />;
}

const STATE_TEXT: Record<Step["state"], string> = {
  done: "Done",
  current: "Current step",
  upcoming: "Not yet",
  cancelled: "Cancelled",
};

function Timeline({ order }: { order: TrackingOrder }) {
  const steps = buildSteps(order);
  return (
    <ol className="mt-5">
      {steps.map((step, index) => {
        const next = steps[index + 1];
        const description = step.event?.description && step.event.description !== ADMIN_DEFAULT_NOTE ? step.event.description : "";
        return (
          <li key={step.key} aria-current={step.state === "current" ? "step" : undefined} className="relative flex gap-4 pb-6 last:pb-0">
            {next ? (
              <span
                aria-hidden="true"
                className={cx(
                  "absolute bottom-1 left-[11px] top-7 w-0.5 rounded-full",
                  next.state === "upcoming" ? "bg-line" : next.state === "cancelled" ? "bg-danger/40" : "bg-ink"
                )}
              />
            ) : null}
            <StepMarker state={step.state} />
            <div className="min-w-0 pt-px">
              <p
                className={cx(
                  "text-[16px] font-semibold leading-[22px]",
                  step.state === "upcoming" ? "text-muted" : step.state === "cancelled" ? "text-danger" : "text-ink"
                )}
              >
                {step.label}
                <span className="sr-only">: {STATE_TEXT[step.state]}</span>
              </p>
              {step.copy ? <p className="mt-0.5 text-[14px] leading-5 text-ink-2">{step.copy}</p> : null}
              {step.event ? (
                <p className="mt-1 text-[13px] leading-[18px] text-muted">
                  <time dateTime={step.event.createdAt}>{formatOrderDateTime(step.event.createdAt)}</time>
                  {step.event.location ? ` · ${step.event.location}` : null}
                </p>
              ) : null}
              {description ? <p className="mt-1 text-[14px] leading-5 text-ink-2">{description}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ResultSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="rounded-sheet border border-line bg-card p-5 sm:p-6">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="mt-4 h-7 w-3/4" />
        <Skeleton className="mt-3 h-4 w-1/2" />
      </div>
      <div className="rounded-card border border-line bg-card p-5 sm:p-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-5 h-4 w-2/3" />
        <Skeleton className="mt-4 h-4 w-1/2" />
        <Skeleton className="mt-4 h-4 w-3/5" />
      </div>
    </div>
  );
}

export default function TrackYourOrderClient({ initialReceipt, initialEmail }: Props) {
  const [receipt, setReceipt] = useState(initialReceipt);
  const [email, setEmail] = useState(initialEmail);
  const autoLoad = Boolean(initialReceipt && initialEmail);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusResult = useRef(false);
  const toast = useToast();

  const loadTracking = async (incomingReceipt = receipt, incomingEmail = email) => {
    if (!incomingReceipt.trim() || !incomingEmail.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await axios.post("/api/track-order", {
        receipt: incomingReceipt.trim(),
        email: incomingEmail.trim(),
      });
      setOrder(res.data);
    } catch (err) {
      setOrder(null);
      setError(
        (axios.isAxiosError(err) && err.response?.data?.error) ||
          "We could not fetch tracking details right now."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialReceipt && initialEmail) {
      loadTracking(initialReceipt, initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReceipt, initialEmail]);

  // After a lookup the visitor started, move focus (and the view) to the result.
  useEffect(() => {
    if (order && focusResult.current) {
      focusResult.current = false;
      headingRef.current?.focus();
    }
  }, [order]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Read the inputs themselves: text typed before the page finished loading
    // never reaches React state.
    const form = event.currentTarget;
    const nextReceipt = inputValue(form, "receipt", receipt).trim();
    const nextEmail = inputValue(form, "email", email).trim();
    setReceipt(nextReceipt);
    setEmail(nextEmail);
    focusResult.current = true;
    loadTracking(nextReceipt, nextEmail);
  };

  const copyTrackingNumber = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Tracking number copied");
    } catch {
      toast.error("Couldn't copy the tracking number", { description: "Press and hold the number to copy it." });
    }
  };

  const status = order ? normalizeStatus(order.fulfillmentStatus) : null;

  return (
    <div className="space-y-6">
      {/* Without JavaScript this GET form reloads the page with ?receipt=&email=, which then loads the order. */}
      <form
        action="/track-your-order"
        method="get"
        onSubmit={handleSubmit}
        className="rounded-sheet border border-line bg-card p-5 sm:p-6"
        aria-label="Find your order"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="track-receipt"
            name="receipt"
            label="Order receipt number"
            hint="Starts with CA-. It is on your order confirmation and invoice."
            value={receipt}
            onChange={(e) => setReceipt(e.target.value)}
            placeholder="CA-1759650000000"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            required
            inputClassName="font-mono tracking-[0.02em]"
          />
          <Input
            id="track-email"
            name="email"
            type="email"
            label="Email"
            hint="The one you used at checkout."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            required
          />
        </div>
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          loadingText="Checking…"
          icon={<IconSearch size={20} />}
          className="mt-5 sm:w-auto sm:px-8"
        >
          Track order
        </Button>
      </form>

      <div>
        {error ? (
          <div role="alert" className="flex gap-3 rounded-card border border-danger/30 bg-danger-soft p-4 text-danger">
            <IconAlert size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-[15px] font-semibold leading-[22px]">{error}</p>
              <p className="mt-1 text-[14px] leading-5 text-ink-2">
                Check the receipt number and use the email you entered at checkout.
              </p>
            </div>
          </div>
        ) : null}

        {loading && !order ? <ResultSkeleton /> : null}

        {order && status ? (
          <div className="space-y-4">
            <section aria-labelledby="track-result-title" className="rounded-sheet border border-line bg-card">
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <OrderStatusChip status={status} />
                  <span className="type-mono text-[13px] text-muted">{order.receipt}</span>
                </div>
                <h2
                  id="track-result-title"
                  ref={headingRef}
                  tabIndex={-1}
                  className="type-h2 mt-3 text-ink outline-none"
                >
                  {HEADLINES[status]}
                </h2>
                {order.estimatedDelivery && status !== "delivered" && status !== "completed" && status !== "cancelled" ? (
                  <p className="mt-2 text-[15px] leading-[22px] text-ink-2">
                    Estimated delivery{" "}
                    <strong className="font-semibold text-ink">{formatOrderDate(order.estimatedDelivery)}</strong>
                  </p>
                ) : null}
              </div>
              <dl className="grid border-t border-line sm:grid-cols-3">
                <div className="px-5 py-4 sm:px-6">
                  <dt className="text-[13px] leading-[18px] text-muted">Courier</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold leading-[22px] text-ink">
                    {order.courierName || <span className="font-normal text-ink-2">Not assigned yet</span>}
                  </dd>
                </div>
                <div className="border-t border-line px-5 py-4 sm:border-l sm:border-t-0 sm:px-6">
                  <dt className="text-[13px] leading-[18px] text-muted">Tracking number</dt>
                  <dd className="mt-0.5 flex items-center gap-2 text-[15px] leading-[22px] text-ink">
                    {order.trackingNumber ? (
                      <>
                        <span className="type-mono break-all font-medium">{order.trackingNumber}</span>
                        <button
                          type="button"
                          onClick={() => copyTrackingNumber(order.trackingNumber)}
                          className="-my-2 inline-flex h-11 shrink-0 items-center rounded-chip px-2 text-[14px] font-semibold text-signal-ink hover:bg-signal-soft"
                        >
                          Copy<span className="sr-only"> tracking number</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-ink-2">Not available yet</span>
                    )}
                  </dd>
                </div>
                <div className="border-t border-line px-5 py-4 sm:border-l sm:border-t-0 sm:px-6">
                  <dt className="text-[13px] leading-[18px] text-muted">Ships to</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold leading-[22px] text-ink">
                    {[order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(", ")}
                    {order.shippingAddress.pincode ? (
                      <span className="type-mono font-medium"> {order.shippingAddress.pincode}</span>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="track-progress-title" className="rounded-card border border-line bg-card p-5 sm:p-6">
              <h2 id="track-progress-title" className="type-h3 text-ink">
                Progress
              </h2>
              <Timeline order={order} />
            </section>

            <section aria-labelledby="track-details-title" className="rounded-card border border-line bg-card">
              <h2 id="track-details-title" className="type-h3 px-5 pt-5 text-ink sm:px-6 sm:pt-6">
                Order details
              </h2>
              <ul className="mt-3 px-5 sm:px-6">
                {order.items.map((item, index) => (
                  <li key={`${item.name}-${index}`} className={cx("flex items-center gap-3 py-3", index > 0 && "border-t border-line")}>
                    <OrderItemThumb image={item.image} name={displayName(item.name)} />
                    <span className="min-w-0 flex-1 text-[15px] leading-[22px] text-ink">
                      {displayName(item.name)}
                      <span className="block text-[13px] leading-[18px] text-muted">Qty {item.quantity}</span>
                    </span>
                    {typeof item.lineTotal === "number" ? (
                      <span className="type-price shrink-0 text-[15px] text-ink">{formatOrderAmount(item.lineTotal)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <dl className="mt-2 border-t border-line px-5 py-4 text-[15px] leading-[22px] sm:px-6">
                <div className="flex justify-between gap-4 py-1">
                  <dt className="text-muted">Invoice</dt>
                  <dd className="type-mono text-right text-[14px] text-ink">{order.invoiceNumber}</dd>
                </div>
                <div className="flex justify-between gap-4 py-1">
                  <dt className="text-muted">Payment</dt>
                  <dd className="text-right text-ink">{paymentLabel(order.paymentMethod)}</dd>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-3">
                  <dt className="font-semibold text-ink">{totalCaption(order.paymentMethod)}</dt>
                  <dd className="type-price text-[19px] text-ink">{formatOrderAmount(order.totalAmount)}</dd>
                </div>
              </dl>
              {order.invoiceUrl ? (
                <div className="border-t border-line p-5 sm:px-6">
                  <ButtonAnchor
                    href={order.invoiceUrl}
                    variant="outline"
                    fullWidth
                    className="sm:w-auto"
                    icon={<IconReceipt size={20} />}
                  >
                    Download invoice (PDF)
                  </ButtonAnchor>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
