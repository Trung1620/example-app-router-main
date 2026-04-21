export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { getApiAuth } from "@/app/api/_auth"; // ✅ JWT(app) + session(web)

export async function GET(req: Request) {
  const debug = req.headers.get("x-debug-auth") === "1";

  const auth = await getApiAuth(req);

  if (!auth.userId) {
    return NextResponse.json(
      debug ? { error: "Unauthorized", via: auth.via } : { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const memberships = await prismadb.orgMember.findMany({
    where: { userId: auth.userId },
    include: { org: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    orgs: memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      role: m.role,
    })),
  });
}