import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    
    const stockMoves = await prismadb.stockMove.findMany({
      where: { orgId },
      include: { items: true }
    });
    
    let totalInbound = 0;
    let totalOutbound = 0;
    
    stockMoves.forEach(move => {
      move.items.forEach(item => {
        if (move.type === 'IN') totalInbound += item.qty;
        else if (move.type === 'OUT') totalOutbound += item.qty;
      });
    });

    return NextResponse.json({
      totalMoves: stockMoves.length,
      totalInbound,
      totalOutbound,
      netStock: totalInbound - totalOutbound
    });
  } catch (error: any) {
    console.error("GET ReportInventory Error:", error);
    return new NextResponse(error.message || "Lỗi server", { status: 500 });
  }
}
