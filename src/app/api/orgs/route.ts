// src/app/api/orgs/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { getUserIdFromJWT } from "../../../../libs/_auth";

export async function POST(req: Request) {
  const debug = req.headers.get("x-debug-auth") === "1";

  const auth = await getUserIdFromJWT(req);
  const reason = "reason" in auth ? auth.reason : "Unauthorized";

  if (!auth.userId) {
    return NextResponse.json(
      debug ? { error: "Unauthorized", reason } : { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const code = body?.code ? String(body.code).trim() : undefined;

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Org name is required" }, { status: 400 });
    }

    const org = await prismadb.$transaction(async (tx) => {
      const created = await tx.org.create({
        data: { name, ...(code ? { code } : {}) },
      });

      await tx.orgMember.create({
        data: {
          orgId: created.id,
          userId: auth.userId as string,
          role: "OWNER",
        },
      });

      return created;
    });

    return NextResponse.json({ org }, { status: 201 });
  } catch (e: any) {
    if (String(e?.code) === "P2002") {
      return NextResponse.json({ error: "Org code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
