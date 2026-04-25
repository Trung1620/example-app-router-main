export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { signJwt } from "@/libs/auth_jwt";
import bcrypt from "bcrypt";
import { checkRateLimit } from "@/libs/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, orgName, name, role, orgCode: joinCode } = body;

    // Rate limiting based on email
    const identifier = `register:${email || "unknown"}`;
    const rateLimitOk = await checkRateLimit(identifier);
    if (!rateLimitOk) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name?.trim() || null;

    const existingUser = await prismadb.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prismadb.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: cleanEmail,
          hashedPassword,
          name: cleanName,
          role: role === "STAFF" ? "STAFF" : "ADMIN",
        },
      });

      let org;
      if (role === "STAFF") {
        // 2. Join existing Org
        if (!joinCode) throw new Error("Nhân viên cần nhập Mã xưởng để tham gia");
        org = await tx.org.findUnique({ where: { code: joinCode } });
        if (!org) throw new Error("Mã xưởng không tồn tại");

        await tx.orgMember.create({
          data: {
            orgId: org.id,
            userId: user.id,
            role: "STAFF",
            status: "PENDING", // Chờ duyệt
          } as any,
        });
      } else {
        // 3. Create new Org (Owner)
        if (!orgName) throw new Error("Chủ xưởng cần nhập Tên xưởng");
        const newOrgCode = `org_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        org = await tx.org.create({
          data: {
            name: orgName.trim(),
            code: newOrgCode,
          },
        });

        await tx.orgMember.create({
          data: {
            orgId: org.id,
            userId: user.id,
            role: "OWNER",
            status: "ACTIVE", // Chủ xưởng mặc định Active
          } as any,
        });
      }

      return { user, org };
    });

    const token = await signJwt({
      sub: result.user.id,
      email: result.user.email ?? undefined,
    });

    return NextResponse.json(
      {
        token,
        user: { id: result.user.id, email: result.user.email, name: result.user.name, role: result.user.role },
        org: { id: result.org.id, name: result.org.name, code: result.org.code },
        status: role === "STAFF" ? "PENDING" : "ACTIVE"
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

