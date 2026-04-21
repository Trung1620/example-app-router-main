export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { getUserIdFromJWT, extractToken } from "@/libs/auth_jwt";

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized", reason: "Missing token" },
        { status: 401 }
      );
    }

    const auth = await getUserIdFromJWT(token);

    if (!auth.userId) {
      const reason = "reason" in auth ? auth.reason : "Invalid token";
      return NextResponse.json(
        { error: "Unauthorized", reason },
        { status: 401 }
      );
    }

    const user = await prismadb.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        phone: true,
        role: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[ME_ERROR]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const auth = await getUserIdFromJWT(token);
    if (!auth.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, image, phone, bio } = body;

    const updatedUser = await prismadb.user.update({
      where: { id: auth.userId },
      data: { name, image, phone, bio },
    });

    return NextResponse.json({
        success: true,
        user: updatedUser
    });
  } catch (error) {
    console.error("UPDATE_USER_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
