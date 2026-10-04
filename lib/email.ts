// Emails are stored trimmed and lowercased from now on. Older records (orders,
// users) can still contain capitals, so lookups match case-insensitively.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Exact, case-insensitive match for Mongo queries: { email: emailMatcher(x) }.
export function emailMatcher(value: unknown) {
  return new RegExp(`^${escapeRegExp(normalizeEmail(value))}$`, "i");
}
