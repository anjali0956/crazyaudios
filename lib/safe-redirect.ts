// Where to send someone after signing in. Only paths on this site are allowed,
// so a crafted ?callbackUrl= can't bounce a fresh login to another domain.
export function safeCallbackPath(value: unknown, origin?: string, fallback = "/") {
  const raw = String(value ?? "").trim();
  if (!raw || raw.includes("\\") || /[\u0000-\u001f\u007f]/.test(raw)) return fallback;

  let path = "";
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    path = raw;
  } else if (origin) {
    // next-auth sometimes passes an absolute URL on our own origin.
    try {
      const url = new URL(raw);
      if (url.origin === origin) path = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return fallback;
    }
  }

  if (!path || path.startsWith("//")) return fallback;
  // Coming back to the login or register page after signing in is pointless.
  if (/^\/(login|register)(?:[/?#]|$)/.test(path)) return fallback;
  return path;
}
