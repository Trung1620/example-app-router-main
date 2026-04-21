// src/app/api/inventory/report/route.ts
// [GET] Báo cáo nhập xuất tồn kho
import prismadb from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { orgId } = await requireApiContext(req);

  const url = new URL(req.url);
  const warehouseId = url.searchParams.get("warehouseId")?.trim();
  const typeFilter = url.searchParams.get("type")?.trim(); // "IN", "OUT", "ADJUST"
  const startDate = url.searchParams.get("startDate"); // ISO format
  const endDate = url.searchParams.get("endDate"); // ISO format

  const where: any = { orgId };
  if (warehouseId) where.warehouseId = warehouseId;
  if (typeFilter) where.type = typeFilter;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  // Lấy tất cả phiếu trong khoảng thời gian
  const moves = await prismadb.stockMove.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true, variant: true } }, warehouse: true },
  });

  // Tính tổng hợp
  const summary = {
    totalMoves: moves.length,
    inMoves: moves.filter((m) => m.type === "IN").length,
    outMoves: moves.filter((m) => m.type === "OUT").length,
    adjustMoves: moves.filter((m) => m.type === "ADJUST").length,
    details: moves.map((m) => ({
      id: m.id,
      type: m.type,
      warehouseName: m.warehouse.name,
      date: m.createdAt,
      items: m.items.map((item) => ({
        productName: item.product?.nameVi || item.variant?.name || "N/A",
        sku: item.variant?.sku || "N/A",
        qty: item.qty,
        unitCost: item.unitCost,
        totalCost: item.unitCost ? item.qty * item.unitCost : 0,
        note: item.note,
      })),
      note: m.note,
    })),
  };

  return NextResponse.json(summary);
}
