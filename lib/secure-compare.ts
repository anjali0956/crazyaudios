import crypto from "crypto";

// Constant-time string comparison for signatures and tokens.
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(String(a), "utf8");
  const right = Buffer.from(String(b), "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
