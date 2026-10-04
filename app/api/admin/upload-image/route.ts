import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import UploadAsset from "@/models/UploadAsset";

export const runtime = "nodejs";

// No SVG: uploads are served from our own origin, and an SVG can carry script.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// The browser-supplied type is only a claim: check the file's first bytes too.
function matchesImageSignature(type: string, bytes: Buffer) {
  switch (type) {
    case "image/jpeg":
      return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/gif":
      return bytes.subarray(0, 4).toString("latin1") === "GIF8";
    case "image/webp":
      return bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP";
    default:
      return false;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    await dbConnect();

    const uploadedFiles: string[] = [];

    for (const file of files) {
      if (file.type === "image/svg+xml" || /\.svgz?$/i.test(file.name || "")) {
        return NextResponse.json(
          { error: "SVG images can't be uploaded. Please use JPG, PNG, WebP or GIF." },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Unsupported image type: ${file.type || "unknown"}. Please use JPG, PNG, WebP or GIF.` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Max allowed size is 5MB.` },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (!matchesImageSignature(file.type, buffer)) {
        return NextResponse.json(
          { error: `${file.name || "This file"} is not a valid ${file.type.replace("image/", "").toUpperCase()} image.` },
          { status: 400 }
        );
      }
      const asset = await UploadAsset.create({
        fileName: file.name || "upload",
        contentType: file.type,
        data: buffer,
        size: file.size,
        uploadedBy: session.user?.email || "",
      });

      uploadedFiles.push(`/api/uploads/${asset._id}`);
    }

    return NextResponse.json({ files: uploadedFiles });
  } catch (error) {
    console.error("[upload-image] Failed:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
