import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prismadb from "@/libs/prismadb";
import { signJwt } from "@/libs/auth_jwt";
import { checkRateLimit } from "@/libs/rate-limit";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Rate limiting based on email
    const identifier = `login:${email || "unknown"}`;
    const rateLimitOk = await checkRateLimit(identifier);
    if (!rateLimitOk) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const e = String(email || "").trim().toLowerCase();
    const p = String(password || "");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(e) || p.length < 8) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    const user = await prismadb.user.findUnique({ where: { email: e } });
    if (!user?.hashedPassword) {
      return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 });
    }

    const ok = await bcrypt.compare(p, user.hashedPassword);
    if (!ok) {
      return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 });
    }

    const token = await signJwt({ sub: user.id, email: user.email || undefined });

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e: any) {
    console.error("LOGIN_ERROR:", e);
    return NextResponse.json({ error: e?.message || "Login failed" }, { status: 500 });
  }
}
