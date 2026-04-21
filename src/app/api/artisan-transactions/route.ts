import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    
    const { artisanId, type, amount, note, date } = body;
    
    // Tạo transaction
    const transaction = await prismadb.artisanTransaction.create({
      data: {
        orgId,
        artisanId,
        type,
        amount: Number(amount),
        note,
        date: date ? new Date(date) : undefined
      }
    });

    // Cập nhật công nợ của thợ nếu là ứng lương (ADVANCE) hoặc trả lương (SALARY/PAYMENT)
    if (type === "ADVANCE") {
      await prismadb.artisan.update({
        where: { id: artisanId },
        data: {
          debt: { increment: Number(amount) }
        }
      });
    } else if (type === "SALARY" || type === "PAYMENT") {
      await prismadb.artisan.update({
        where: { id: artisanId },
        data: {
          debt: { decrement: Number(amount) }
        }
      });
    }
    
    return NextResponse.json(transaction);
  } catch (error: any) {
    console.error("POST ArtisanTransaction Error:", error);
    return new NextResponse(error.message || "Lỗi server", { status: 500 });
  }
}
