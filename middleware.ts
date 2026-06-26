import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  PREVIEW_ACCESS_COOKIE,
  getExpectedPreviewAccessToken,
  isPreviewProtectionEnabled,
} from "@/lib/preview-access";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.[^/]+$/);

  const isAllowedWithoutPreview =
    pathname === "/preview" ||
    pathname === "/api/preview-access" ||
    pathname.startsWith("/api/auth");

  if (isStaticAsset || isAllowedWithoutPreview) {
    return NextResponse.next();
  }

  if (isPreviewProtectionEnabled()) {
    const previewAccessCookie = request.cookies.get(PREVIEW_ACCESS_COOKIE)?.value;
    const expectedPreviewToken = await getExpectedPreviewAccessToken();

    if (previewAccessCookie !== expectedPreviewToken) {
      const previewUrl = new URL("/preview", request.url);
      previewUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(previewUrl);
    }
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token?.role !== "admin") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
