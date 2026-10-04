export const SITE_NAME = "CrazyAudios";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.crazyaudios.com").replace(
  /\/+$/,
  ""
);

export function absoluteUrl(pathOrUrl: string) {
  const value = String(pathOrUrl || "").trim();
  if (!value) return SITE_URL;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}
