export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { signJwt } from "@/libs/auth_jwt";
import bcrypt from "bcrypt";
import { checkRateLimit } from "@/libs/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, orgName, name } = body;

    // Rate limiting based on email
    const identifier = `register:${email || "unknown"}`;
    const rateLimitOk = await checkRateLimit(identifier);
    if (!rateLimitOk) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    if (!email || !password || !orgName) {
      return NextResponse.json(
        { error: "Missing email, password or orgName" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOrgName = orgName.trim();
    const cleanName = name?.trim() || null;

    const existingUser = await prismadb.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: "Password must be 12+ characters with uppercase, lowercase, number, and special character" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const orgCode = `org_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const { user, org } = await prismadb.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: cleanEmail,
          hashedPassword,
          name: cleanName,
        },
      });

      const org = await tx.org.create({
        data: {
          name: cleanOrgName,
          code: orgCode,
        },
      });

      await tx.orgMember.create({
        data: {
          orgId: org.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return { user, org };
    });

    const token = await signJwt({
      sub: user.id,
      email: user.email ?? undefined,
    });

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        org: {
          id: org.id,
          name: org.name,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[REGISTER_ERROR]", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
