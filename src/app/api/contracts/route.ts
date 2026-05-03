import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { orgId } = await requireApiContext(req as any);

    // Lấy danh sách các Báo giá có trạng thái CONFIRMED, DONE, DELIVERING 
    // (những báo giá này được coi là Hợp đồng trong hệ thống)
    const quotes = await prismadb.quote.findMany({
      where: {
        orgId,
        status: {
          in: ["CONFIRMED", "DELIVERING", "DONE"]
        }
      },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Ánh xạ dữ liệu để phù hợp với giao diện Hợp đồng
    const contracts = quotes.map((q) => ({
      id: q.id,
      number: q.number,
      status: q.status,
      buyerName: q.customer?.name || q.customer?.companyName || "Khách lẻ",
      quoteNumber: q.number,
      grandTotal: q.grandTotal,
      createdAt: q.createdAt,
    }));

    return NextResponse.json(contracts);
  } catch (error: any) {
    console.error("GET_CONTRACTS_ERROR", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
