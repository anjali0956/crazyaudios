import { NextResponse } from "next/server";
import {
  PREVIEW_ACCESS_COOKIE,
  getExpectedPreviewAccessToken,
  isPreviewProtectionEnabled,
} from "@/lib/preview-access";

export async function POST(request: Request) {
  try {
    if (!isPreviewProtectionEnabled()) {
      return NextResponse.json(
        { success: true, disabled: true, next: "/" },
        { status: 200 }
      );
    }

    const body = await request.json();
    const password = String(body?.password || "");
    const nextPath = String(body?.next || "/");

    const expectedPassword = process.env.PREVIEW_SITE_PASSWORD || "";

    if (!password || password !== expectedPassword) {
      return NextResponse.json(
        { error: "Incorrect preview password" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      next: nextPath.startsWith("/") ? nextPath : "/",
    });

    response.cookies.set(PREVIEW_ACCESS_COOKIE, await getExpectedPreviewAccessToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Could not validate preview access" },
      { status: 500 }
    );
  }
}
