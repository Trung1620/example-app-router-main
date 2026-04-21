import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { artisanId, type, amount, note, date } = body;

    if (!artisanId || !type || amount == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const nAmount = parseFloat(amount);

    const result = await prismadb.$transaction(async (tx) => {
      // 1. Create transaction
      const transaction = await tx.artisanTransaction.create({
        data: {
          orgId,
          artisanId,
          type,
          amount: nAmount,
          note,
          date: date ? new Date(date) : new Date(),
        },
      });

      // 2. Update artisan debt/balance
      // Nếu là Ứng lương (ADVANCE), nợ tăng lên.
      // Nếu là Trả lương (SALARY), nợ giảm đi (hoặc ghi nhận chi phí).
      // Ở đây ta giả sử field 'debt' là số tiền thợ đang nợ/đã ứng.
      if (type === "ADVANCE") {
        await tx.artisan.update({
          where: { id: artisanId },
          data: { debt: { increment: nAmount } },
        });
      } else if (type === "REPAYMENT") {
        await tx.artisan.update({
          where: { id: artisanId },
          data: { debt: { decrement: nAmount } },
        });
      }

      return transaction;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[ARTISAN_TX_POST]", error);
    return NextResponse.json({ error: error?.message || "Internal Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const { searchParams } = new URL(req.url);
    const artisanId = searchParams.get("artisanId");

    const where: any = { orgId };
    if (artisanId) where.artisanId = artisanId;

    const transactions = await prismadb.artisanTransaction.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
