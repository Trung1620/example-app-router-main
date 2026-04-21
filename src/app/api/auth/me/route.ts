export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";

// ✅ dùng chung _auth đang nằm ở orgs
import { getUserIdFromJWT } from "../../orgs/_auth";

export async function GET(req: Request) {
  const debug = req.headers.get("x-debug-auth") === "1";

  // ✅ BẮT BUỘC truyền req vào
  const auth = await getUserIdFromJWT(req);

  if (!auth.userId) {
    return NextResponse.json(
      debug ? { error: "Unauthorized", ...auth } : { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await prismadb.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json(
      debug ? { error: "User not found", userId: auth.userId } : { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ user });
}
