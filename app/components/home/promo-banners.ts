// The admin's homepage promo banners (Admin -> "Homepage Banner Pair",
// SiteSettings.homepageBanners.left/right). Shown only when the admin has set
// real images: the stock SVG fallbacks (/banners/*.svg) are never shown.
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { normalizeImageSrc } from "@/app/components/ui/ProductImage";

export type PromoBanner = {
  src: string;
  href: string;
  /** Accessible name of the card link (the image text is the admin's). */
  label: string;
  /** Intrinsic size, so each card keeps its own aspect ratio (null = unknown). */
  width: number | null;
  height: number | null;
};

// Where each slot links (the admin form has no link field). Left keeps the
// destination the old homepage gave it (the diode category, for the
// Circlophone parts banner); right carries the "only original products" banner.
const SLOTS = {
  left: { href: "/category/diodes", label: "Shop diodes" },
  right: { href: "/why-genuine", label: "Why our parts are original" },
} as const;

/** Same path rules as /api/settings, so stored values resolve identically. */
function normalizeBannerPath(value: unknown) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase().includes("brainsbanner")) return "/banners/original-products-banner.svg";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return trimmed;
  if (/\.(svg|png|jpe?g|webp|gif)$/i.test(trimmed)) return `/banners/${trimmed}`;
  return `/banners/${trimmed}.jpg`;
}

/** The stock artwork (crazyaudios-banner-left/right.svg, original-products-banner.svg …) counts as "not set". */
function isAdminImage(src: string) {
  return Boolean(src) && !/^\/banners\/[^?#]*\.svg$/i.test(src) && !/\.svg($|[?#])/i.test(src);
}

type SettingsDoc = { homepageBanners?: { left?: string; right?: string } } | null;

const readBannerSettings = unstable_cache(
  async () => {
    const [{ default: dbConnect }, { default: SiteSettings }] = await Promise.all([
      import("@/lib/mongodb"),
      import("@/models/SiteSettings"),
    ]);
    await dbConnect();
    const doc = (await SiteSettings.findOne({ key: "site" }).lean()) as SettingsDoc;
    return { left: String(doc?.homepageBanners?.left ?? ""), right: String(doc?.homepageBanners?.right ?? "") };
  },
  ["home:banner-settings:v1"],
  { revalidate: 60, tags: ["settings"] }
);

/** Width/height from an image file header (PNG, JPEG, GIF, WebP). */
function imageSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) return null;
  if (buffer.readUInt32BE(0) === 0x89504e47) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (buffer.toString("ascii", 0, 3) === "GIF") return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    return null;
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
        offset += marker === 0xff ? 1 : 2;
        continue;
      }
      // Start-of-frame markers carry the size (not DHT c4, JPG c8, DAC cc).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
  }
  return null;
}

async function readImageBytes(src: string): Promise<Buffer | null> {
  const upload = src.match(/^\/api\/uploads\/([a-f0-9]{24})(?:[?#].*)?$/i);
  if (upload) {
    const [{ default: dbConnect }, { default: UploadAsset }] = await Promise.all([
      import("@/lib/mongodb"),
      import("@/models/UploadAsset"),
    ]);
    await dbConnect();
    const asset = (await UploadAsset.findById(upload[1]).select("data").lean()) as { data?: unknown } | null;
    const data = asset?.data as { buffer?: unknown } | Buffer | Uint8Array | undefined;
    if (!data) return null;
    if (Buffer.isBuffer(data)) return data;
    if (data instanceof Uint8Array) return Buffer.from(data);
    if (data && typeof data === "object" && "buffer" in data && data.buffer instanceof Uint8Array) return Buffer.from(data.buffer);
    return null;
  }
  if (!src.startsWith("/") || src.startsWith("//")) return null;
  const publicDir = path.join(process.cwd(), "public");
  const file = path.normalize(path.join(publicDir, decodeURIComponent(src.split(/[?#]/)[0])));
  if (!file.startsWith(publicDir + path.sep)) return null;
  return fs.readFile(file);
}

const readBannerSize = unstable_cache(
  async (src: string) => {
    try {
      const bytes = await readImageBytes(src);
      return bytes ? imageSize(bytes) : null;
    } catch {
      return null;
    }
  },
  ["home:banner-size:v1"],
  { revalidate: 86400, tags: ["settings"] }
);

/** Banners to show (0, 1 or 2), in slot order. Never throws. */
export async function getPromoBanners(): Promise<PromoBanner[]> {
  try {
    const settings = await readBannerSettings();
    const slots = (["left", "right"] as const)
      .map((slot) => ({ slot, src: normalizeImageSrc(normalizeBannerPath(settings[slot])) }))
      .filter((entry) => isAdminImage(entry.src));
    return await Promise.all(
      slots.map(async ({ slot, src }) => {
        const size = await readBannerSize(src);
        return { src, ...SLOTS[slot], width: size?.width ?? null, height: size?.height ?? null };
      })
    );
  } catch (error) {
    console.error("home: promo banners unavailable", error);
    return [];
  }
}
