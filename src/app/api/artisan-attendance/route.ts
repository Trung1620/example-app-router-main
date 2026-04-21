import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    
    const { artisanId, status, note, date } = body;
    
    // Tạo attendance
    const attendance = await prismadb.artisanAttendance.create({
      data: {
        orgId,
        artisanId,
        status,
        note,
        date: date ? new Date(date) : undefined
      }
    });

    // Cập nhật isWorking của thợ
    await prismadb.artisan.update({
      where: { id: artisanId },
      data: {
        isWorking: status === "PRESENT"
      }
    });
    
    return NextResponse.json(attendance);
  } catch (error: any) {
    console.error("POST ArtisanAttendance Error:", error);
    return new NextResponse(error.message || "Lỗi server", { status: 500 });
  }
}
