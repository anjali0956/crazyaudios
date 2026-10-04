import crypto from "crypto";
import mongoose from "mongoose";
import Order from "@/models/Order";
import User from "@/models/User";
import { emailMatcher, normalizeEmail } from "@/lib/email";
import { safeEqual } from "@/lib/secure-compare";

// Who may see an order.
// - A signed-in customer sees orders placed while signed in to that account
//   (userId, set from the session at checkout). The checkout email alone never
//   grants access: anyone can register any email address.
// - A guest gets one order through a signed link: orderAccessToken() is an
//   HMAC of the order id + receipt, so it can't be forged or guessed.
// - Admins see everything.

export type SessionUserLike =
  | { id?: string | null; email?: string | null; role?: string | null }
  | null
  | undefined;

function accessSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not configured");
  return secret;
}

export function orderAccessToken(orderId: string, receipt: string) {
  return crypto
    .createHmac("sha256", accessSecret())
    .update(`${orderId}${receipt}`)
    .digest("base64url");
}

export function isValidOrderAccessToken(orderId: string, receipt: string, token: unknown) {
  if (typeof token !== "string" || !token || !receipt) return false;
  return safeEqual(orderAccessToken(orderId, receipt), token);
}

export function orderInvoicePath(order: { _id: unknown; receipt: string }) {
  const id = String(order._id);
  return `/api/orders/${id}/invoice?token=${encodeURIComponent(orderAccessToken(id, order.receipt))}`;
}

type AccountRecord = { _id: mongoose.Types.ObjectId; createdAt?: Date };

async function findAccount(user: SessionUserLike) {
  if (user?.id && mongoose.isValidObjectId(user.id)) {
    const byId = await User.findById(user.id).select("createdAt").lean<AccountRecord>();
    if (byId) return byId;
  }
  const email = normalizeEmail(user?.email);
  if (!email) return null;
  return User.findOne({ email: emailMatcher(email) }).select("createdAt").lean<AccountRecord>();
}

function accountCreatedAt(account: AccountRecord | null) {
  if (!account) return null;
  if (account.createdAt) return new Date(account.createdAt);
  return account._id?.getTimestamp?.() ?? null;
}

// Orders saved before userId existed only kept userEmail, which for guest
// checkouts was copied from the form. Those count as the account's own only
// if placed after the account was created: an order placed while signed in
// always is, while someone registering a stranger's email later doesn't get
// that stranger's earlier guest orders.
export async function ownedOrdersFilter(user: SessionUserLike) {
  const conditions: Record<string, unknown>[] = [];

  if (user?.id) conditions.push({ userId: String(user.id) });

  const email = normalizeEmail(user?.email);
  if (email) {
    const since = accountCreatedAt(await findAccount(user));
    if (since) {
      conditions.push({
        userId: { $exists: false },
        userEmail: emailMatcher(email),
        createdAt: { $gte: since },
      });
    }
  }

  return conditions.length ? { $or: conditions } : null;
}

export async function isOrderOwnedBy(
  order: { userId?: string | null; userEmail?: string; createdAt?: Date | string },
  user: SessionUserLike
) {
  if (!user) return false;

  if (order.userId !== undefined) {
    return Boolean(order.userId && user.id && String(order.userId) === String(user.id));
  }

  const email = normalizeEmail(user.email);
  if (!email || normalizeEmail(order.userEmail) !== email || !order.createdAt) return false;
  const since = accountCreatedAt(await findAccount(user));
  return Boolean(since && new Date(order.createdAt).getTime() >= since.getTime());
}

// For the order-confirmation page: the id and receipt from its URL must both match.
export async function findOrderByIdAndReceipt(orderId: unknown, receipt: unknown) {
  const id = String(orderId || "");
  const receiptValue = String(receipt || "");
  if (!mongoose.isValidObjectId(id) || !receiptValue) return null;

  const order = await Order.findById(id).lean<{ receipt?: string } & Record<string, unknown>>();
  if (!order || !order.receipt || !safeEqual(order.receipt, receiptValue)) return null;
  return order;
}
