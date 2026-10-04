import crypto from "crypto";
import { META_PIXEL_ID, getPurchaseEventId } from "@/lib/meta-pixel";
import { absoluteUrl } from "@/lib/site";

// Meta Conversions API: reports confirmed purchases from the server, so sales
// still count when the browser pixel is blocked. Shares an event_id with the
// browser Purchase event so Meta keeps only one of the two.

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v26.0";
const REQUEST_TIMEOUT_MS = 4000;

type OrderForCapi = {
  _id: unknown;
  totalAmount: number;
  subtotal?: number;
  currency?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  shippingAddress?: { city?: string; state?: string; pincode?: string };
  items?: Array<{ productId: unknown; quantity: number; unitPrice: number }>;
  attribution?: { fbclid?: string | null; capturedAt?: string | Date | null } | null;
};

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashed(value: string) {
  return value ? [sha256(value)] : undefined;
}

function normalizeLetters(value?: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function normalizeIndianPhone(value?: string) {
  let digits = String(value || "").replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 ? digits : "";
}

function readCookie(cookieHeader: string, name: string) {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function getClientIp(headers: Headers) {
  const direct = headers.get("cf-connecting-ip") || headers.get("do-connecting-ip");
  if (direct) return direct.trim();
  const forwarded = headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "";
}

export function buildPurchaseEvent(order: OrderForCapi, request: Request) {
  const orderId = String(order._id);
  const headers = request.headers;
  const cookieHeader = headers.get("cookie") || "";

  const nameParts = String(order.customerName || "").trim().split(/\s+/).filter(Boolean);
  const firstName = normalizeLetters(nameParts[0]);
  const lastName = nameParts.length > 1 ? normalizeLetters(nameParts[nameParts.length - 1]) : "";

  let fbc = readCookie(cookieHeader, "_fbc");
  const fbclid = order.attribution?.fbclid;
  if (!fbc && fbclid) {
    const capturedAt = order.attribution?.capturedAt
      ? new Date(order.attribution.capturedAt).getTime()
      : Date.now();
    fbc = `fb.1.${Number.isFinite(capturedAt) ? capturedAt : Date.now()}.${fbclid}`;
  }

  const userData: Record<string, unknown> = {
    em: hashed(String(order.customerEmail || "").trim().toLowerCase()),
    ph: hashed(normalizeIndianPhone(order.customerPhone)),
    fn: hashed(firstName),
    ln: hashed(lastName),
    ct: hashed(normalizeLetters(order.shippingAddress?.city)),
    st: hashed(normalizeLetters(order.shippingAddress?.state)),
    zp: hashed(String(order.shippingAddress?.pincode || "").replace(/\s/g, "")),
    country: hashed("in"),
    client_ip_address: getClientIp(headers) || undefined,
    client_user_agent: headers.get("user-agent") || undefined,
    fbp: readCookie(cookieHeader, "_fbp") || undefined,
    fbc: fbc || undefined,
  };
  for (const key of Object.keys(userData)) {
    if (userData[key] === undefined) delete userData[key];
  }

  const items = order.items || [];
  return {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: getPurchaseEventId(orderId),
    action_source: "website",
    event_source_url: absoluteUrl("/checkout"),
    user_data: userData,
    custom_data: {
      currency: order.currency || "INR",
      value: Number(order.subtotal ?? order.totalAmount) || 0,
      order_id: orderId,
      content_type: "product",
      content_ids: items.map((item) => String(item.productId)),
      contents: items.map((item) => ({
        id: String(item.productId),
        quantity: Number(item.quantity) || 1,
        item_price: Number(item.unitPrice) || 0,
      })),
      num_items: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    },
  };
}

// Never throws and never takes longer than REQUEST_TIMEOUT_MS: a tracking
// failure must not affect the customer's order.
export async function sendMetaPurchaseEvent(order: OrderForCapi, request: Request) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) return false;

  try {
    const body: Record<string, unknown> = {
      data: [buildPurchaseEvent(order, request)],
      access_token: accessToken,
    };
    if (process.env.META_TEST_EVENT_CODE) {
      body.test_event_code = process.env.META_TEST_EVENT_CODE;
    }

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PIXEL_ID}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      console.warn(
        `[meta-capi] Purchase for order ${String(order._id)} rejected (${response.status}):`,
        payload?.error?.message || "unknown error"
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      `[meta-capi] Purchase for order ${String(order._id)} failed:`,
      error instanceof Error ? error.message : error
    );
    return false;
  }
}
