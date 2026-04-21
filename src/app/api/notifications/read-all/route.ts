import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

// POST /api/notifications/read-all
export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);

    await prismadb.notification.updateMany({
      where: { orgId, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("READ_ALL_NOTIFICATIONS_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
