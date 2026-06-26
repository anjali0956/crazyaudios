export const PREVIEW_ACCESS_COOKIE = "crazyaudios_preview_access";

const textEncoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function isPreviewProtectionEnabled() {
  return (
    process.env.PREVIEW_SITE_ENABLED === "true" &&
    Boolean(process.env.PREVIEW_SITE_PASSWORD)
  );
}

export async function createPreviewAccessToken(password: string) {
  const seed = `${password}:${process.env.NEXTAUTH_SECRET || "preview-access"}:crazyaudios-preview`;
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(seed));
  return toHex(digest);
}

export async function getExpectedPreviewAccessToken() {
  const password = process.env.PREVIEW_SITE_PASSWORD || "";
  return createPreviewAccessToken(password);
}
