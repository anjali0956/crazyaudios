// Sliding-window rate limits held in this server process's memory.
// Per instance: with more than one app instance each keeps its own counts, and
// a restart or redeploy clears them. Good enough to stop casual abuse (fake
// COD orders); not a security boundary.

type Limit = { key: string; limit: number; windowMs: number };

type Store = Map<string, number[]>;

const globalStore = globalThis as unknown as { __caRateLimits?: Store; __caRateLimitSweep?: number };
const hits: Store = globalStore.__caRateLimits ?? (globalStore.__caRateLimits = new Map());

function recentHits(key: string, windowMs: number, now: number) {
  const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
  if (recent.length) hits.set(key, recent);
  else hits.delete(key);
  return recent;
}

function sweep(now: number) {
  if (now - (globalStore.__caRateLimitSweep || 0) < 10 * 60 * 1000) return;
  globalStore.__caRateLimitSweep = now;
  const dayMs = 24 * 60 * 60 * 1000;
  for (const [key, times] of hits) {
    if (!times.length || now - times[times.length - 1] > dayMs) hits.delete(key);
  }
}

// Checks every limit first and records a hit against all of them only when
// none is exceeded, so a rejected attempt doesn't use up anything.
export function consumeRateLimits(limits: Limit[]) {
  const now = Date.now();
  sweep(now);

  for (const { key, limit, windowMs } of limits) {
    const recent = recentHits(key, windowMs, now);
    if (recent.length >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
      return { allowed: false as const, key, retryAfterSeconds };
    }
  }

  for (const { key } of limits) {
    hits.set(key, [...(hits.get(key) || []), now]);
  }
  return { allowed: true as const };
}

// The visitor's IP as seen by our edge (Cloudflare / DigitalOcean set these).
export function getRequestIp(headers: Headers) {
  const direct = headers.get("cf-connecting-ip") || headers.get("do-connecting-ip");
  if (direct) return direct.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
