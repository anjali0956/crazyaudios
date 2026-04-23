import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import TrafficEvent from "@/models/TrafficEvent";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfLast7Days() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - 6);
  return date;
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();
    const path = String(body?.path || "").trim();
    const visitorId = String(body?.visitorId || "").trim();

    if (!path || !visitorId) {
      return NextResponse.json({ error: "Missing path or visitorId" }, { status: 400 });
    }

    if (path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }

    const referrer = req.headers.get("referer") || "";
    const userAgent = req.headers.get("user-agent") || "";

    await TrafficEvent.create({
      visitorId,
      path,
      referrer,
      userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Traffic POST failed:", error);
    return NextResponse.json({ error: "Failed to log traffic" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const today = startOfToday();
    const last7Days = startOfLast7Days();

    const [
      totalPageViews,
      todayPageViews,
      totalUniqueVisitorsRaw,
      todayUniqueVisitorsRaw,
      topPages,
      recentDailyViews,
    ] = await Promise.all([
      TrafficEvent.countDocuments(),
      TrafficEvent.countDocuments({ createdAt: { $gte: today } }),
      TrafficEvent.distinct("visitorId"),
      TrafficEvent.distinct("visitorId", { createdAt: { $gte: today } }),
      TrafficEvent.aggregate([
        { $match: { createdAt: { $gte: last7Days } } },
        { $group: { _id: "$path", views: { $sum: 1 }, visitors: { $addToSet: "$visitorId" } } },
        { $project: { _id: 0, path: "$_id", views: 1, visitors: { $size: "$visitors" } } },
        { $sort: { views: -1 } },
        { $limit: 8 },
      ]),
      TrafficEvent.aggregate([
        { $match: { createdAt: { $gte: last7Days } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            views: { $sum: 1 },
            visitors: { $addToSet: "$visitorId" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        {
          $project: {
            _id: 0,
            label: {
              $concat: [
                { $toString: "$_id.day" },
                "/",
                { $toString: "$_id.month" },
              ],
            },
            views: 1,
            visitors: { $size: "$visitors" },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      summary: {
        totalPageViews,
        todayPageViews,
        totalUniqueVisitors: totalUniqueVisitorsRaw.length,
        todayUniqueVisitors: todayUniqueVisitorsRaw.length,
      },
      topPages,
        recentDailyViews,
      });
  } catch (error) {
    console.error("Traffic GET failed:", error);
    return NextResponse.json({ error: "Failed to load traffic analytics" }, { status: 500 });
  }
}
