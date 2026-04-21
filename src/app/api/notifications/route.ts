import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

// GET /api/notifications
export async function GET(req: NextRequest) {
  try {
    const context = await requireApiContext(req);
    // @ts-ignore
    if (context.error) return NextResponse.json({ error: context.error }, { status: context.status });
    
    // @ts-ignore
    const { orgId } = context;

    const notifications = await prismadb.notification.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("GET_NOTIFICATIONS_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/notifications -> Đánh dấu 1 thông báo là đã đọc
export async function PATCH(req: NextRequest) {
    try {
      const { orgId } = await requireApiContext(req);
      const body = await req.json();
      const { id } = body;

      if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

      if (id === "all") {
        const result = await prismadb.notification.updateMany({
          where: { orgId, isRead: false },
          data: { isRead: true },
        });
        return NextResponse.json({ ok: true, count: result.count });
      }

      const notification = await prismadb.notification.update({
        where: { id, orgId },
        data: { isRead: true },
      });

      return NextResponse.json(notification);
    } catch (error) {
      console.error("READ_ONE_NOTIFICATION_ERROR", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
