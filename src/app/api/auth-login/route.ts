export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { signJwt } from "@/libs/auth_jwt";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email và password là bắt buộc" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // SPECIAL CASE: DEFAULT ADMIN FOR DEMO
    if (cleanEmail === "admin@seedbiz.com" && password === "123456") {
      let adminUser = await prismadb.user.findUnique({ where: { email: cleanEmail } });
      if (!adminUser) {
        const hashedPassword = await bcrypt.hash("123456", 12);
        adminUser = await prismadb.user.create({
          data: {
            email: cleanEmail,
            name: "Master Admin",
            hashedPassword,
            role: "ADMIN"
          }
        });
      }

      // Ensure they have an Org and are ACTIVE
      let membership = await prismadb.orgMember.findFirst({
        where: { userId: adminUser.id }
      });

      if (!membership) {
        const defaultOrg = await prismadb.org.create({
          data: {
            name: "Kho Mây Tre (Hệ thống)",
            code: "admin_master",
          }
        });

        await prismadb.orgMember.create({
          data: {
            userId: adminUser.id,
            orgId: defaultOrg.id,
            role: "OWNER",
            status: "ACTIVE"
          } as any
        });
      } else if ((membership as any).status !== "ACTIVE") {
        await prismadb.orgMember.update({
          where: { id: membership.id },
          data: { status: "ACTIVE", role: "OWNER" } as any
        });
      }



      const token = await signJwt({ sub: adminUser.id, email: adminUser.email ?? undefined });
      return NextResponse.json({
        token,
        user: { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: "ADMIN" },
      });
    }

    const user = await prismadb.user.findUnique({
      where: { email: cleanEmail },
    });


    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isValid) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    const token = await signJwt({
      sub: user.id,
      email: user.email ?? undefined,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("[LOGIN_ERROR]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
