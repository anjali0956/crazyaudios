import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import UploadAsset from "@/models/UploadAsset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeBinaryData(raw: unknown) {
  if (!raw) return null;

  if (Buffer.isBuffer(raw)) {
    return raw;
  }

  if (raw instanceof Uint8Array) {
    return Buffer.from(raw);
  }

  if (
    typeof raw === "object" &&
    raw !== null &&
    "buffer" in raw &&
    Buffer.isBuffer((raw as { buffer?: unknown }).buffer)
  ) {
    return (raw as { buffer: Buffer }).buffer;
  }

  if (
    typeof raw === "object" &&
    raw !== null &&
    "type" in raw &&
    (raw as { type?: unknown }).type === "Buffer" &&
    "data" in raw &&
    Array.isArray((raw as { data?: unknown }).data)
  ) {
    return Buffer.from((raw as { data: number[] }).data);
  }

  return null;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await dbConnect();

    const asset = await UploadAsset.findById(id).lean<{
      data: unknown;
      contentType: string;
      fileName: string;
      size?: number;
    } | null>();

    if (!asset) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const normalizedBuffer = normalizeBinaryData(asset.data);

    if (!normalizedBuffer) {
      return new NextResponse("Image data is invalid", { status: 500 });
    }

    const body = Uint8Array.from(normalizedBuffer);

    return new Response(body as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": asset.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${asset.fileName}"`,
        "Content-Length": String(asset.size || normalizedBuffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Failed to load image", { status: 500 });
  }
}
