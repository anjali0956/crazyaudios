import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import SiteSettings from "@/models/SiteSettings";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const DEFAULT_BANNERS = {
  left: "/banners/crazyaudios-banner-left.svg",
  right: "/banners/original-products-banner.svg",
};

function normalizeBannerPath(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase().includes("brainsbanner")) {
    return "/banners/original-products-banner.svg";
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  if (/\.(svg|png|jpe?g|webp|gif)$/i.test(trimmed)) {
    return `/banners/${trimmed}`;
  }
  return `/banners/${trimmed}.jpg`;
}

async function getSiteSettings() {
  await dbConnect();

  return SiteSettings.findOneAndUpdate(
    { key: "site" },
    { $setOnInsert: { key: "site", homepageBanners: DEFAULT_BANNERS } },
    { new: true, upsert: true }
  );
}

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json({
      homepageBanners: settings.homepageBanners || DEFAULT_BANNERS,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const left = normalizeBannerPath(body?.homepageBanners?.left || "");
    const right = normalizeBannerPath(body?.homepageBanners?.right || "");

    if (!left || !right) {
      return NextResponse.json(
        { error: "Both banner image URLs are required" },
        { status: 400 }
      );
    }

    const settings = await SiteSettings.findOneAndUpdate(
      { key: "site" },
      { key: "site", homepageBanners: { left, right } },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      homepageBanners: settings.homepageBanners,
    });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
