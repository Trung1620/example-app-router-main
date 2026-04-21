import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { artisanId, date, status, note } = body;

    if (!artisanId) {
      return NextResponse.json({ error: "artisanId is required" }, { status: 400 });
    }

    // Check if attendance already exists for this date
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const existing = await prismadb.artisanAttendance.findFirst({
      where: {
        artisanId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existing) {
      const updated = await prismadb.artisanAttendance.update({
        where: { id: existing.id },
        data: { status: status || "PRESENT", note },
      });
      return NextResponse.json(updated);
    }

    const attendance = await prismadb.artisanAttendance.create({
      data: {
        orgId,
        artisanId,
        date: startOfDay,
        status: status || "PRESENT",
        note,
      },
    });

    // Update the isWorking status on the Artisan model for today
    if (startOfDay.toDateString() === new Date().toDateString()) {
       await prismadb.artisan.update({
         where: { id: artisanId },
         data: { isWorking: (status || "PRESENT") === "PRESENT" }
       });
    }

    return NextResponse.json(attendance);
  } catch (error: any) {
    console.error("[ATTENDANCE_POST]", error);
    return NextResponse.json({ error: error?.message || "Internal Error" }, { status: 500 });
  }
}
