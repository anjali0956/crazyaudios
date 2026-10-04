import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { emailMatcher, isValidEmail, normalizeEmail } from "@/lib/email";

const ALREADY_REGISTERED =
  "An account with this email already exists. Please sign in instead.";

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const name = String(body?.name ?? "").replace(/\s+/g, " ").trim();
    const email = normalizeEmail(body?.email);
    const password = String(body?.password ?? "");

    const fieldErrors: Record<string, string> = {};
    if (name.length < 2 || name.length > 80) fieldErrors.name = "Enter your name (2 to 80 characters).";
    if (!isValidEmail(email)) fieldErrors.email = "Enter a valid email address.";
    if (password.length < 8) fieldErrors.password = "Use at least 8 characters for your password.";
    else if (password.length > 128) fieldErrors.password = "Use at most 128 characters for your password.";

    const firstError = Object.values(fieldErrors)[0];
    if (firstError) {
      return NextResponse.json({ error: firstError, fieldErrors }, { status: 400 });
    }

    await dbConnect();

    // Older accounts can be stored with capitals: compare case-insensitively.
    if (await User.exists({ email: emailMatcher(email) })) {
      return NextResponse.json({ error: ALREADY_REGISTERED }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user"
    });

    return NextResponse.json({ message: "User created" });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      return NextResponse.json({ error: ALREADY_REGISTERED }, { status: 409 });
    }
    console.error("[register] Failed:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
