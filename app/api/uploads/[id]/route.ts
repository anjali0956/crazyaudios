import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import UploadAsset from "@/models/UploadAsset";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await dbConnect();

    const asset = await UploadAsset.findById(id).lean<{
      data: Buffer;
      contentType: string;
      fileName: string;
    } | null>();

    if (!asset) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const binary = Uint8Array.from(asset.data);
    const body = new Blob([binary], {
      type: asset.contentType,
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": asset.contentType,
        "Content-Disposition": `inline; filename="${asset.fileName}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Failed to load image", { status: 500 });
  }
}
