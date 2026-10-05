import { NextResponse } from "next/server";
import { consumeRateLimits, getRequestIp } from "@/lib/rate-limit";
import { lookupPincode, PincodeLookupError } from "./lookup";

// GET /api/pincode/682001
//   200 { pincode, found: true, city, district, state }
//   200 { pincode, found: false, reason: "not_found" | "unavailable" }
// Pre-fills city and state at checkout. Expected misses are 200s (not 4xx/5xx)
// so a customer's browser console stays clean; the checkout falls back to
// manual entry either way and never blocks on this route.

export const dynamic = "force-dynamic";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const LOOKUPS_PER_IP = 120;

export async function GET(req: Request, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;
  const pincode = String(pin || "").trim();

  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return NextResponse.json(
      { error: "Enter a valid 6-digit PIN code" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const ip = getRequestIp(req.headers);
  if (ip !== "unknown") {
    const limit = consumeRateLimits([{ key: `pincode-ip:${ip}`, limit: LOOKUPS_PER_IP, windowMs: TEN_MINUTES_MS }]);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many lookups. Please type your city and state." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } }
      );
    }
  }

  try {
    const { info } = await lookupPincode(pincode);
    if (!info) {
      return NextResponse.json(
        { pincode, found: false, reason: "not_found" },
        { headers: { "Cache-Control": "public, max-age=3600" } }
      );
    }
    return NextResponse.json(
      { ...info, found: true },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
    );
  } catch (error) {
    const detail = error instanceof PincodeLookupError ? error.message : String((error as Error)?.message || error);
    console.warn(`[pincode] Lookup for ${pincode} failed: ${detail}`);
    return NextResponse.json(
      { pincode, found: false, reason: "unavailable" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
