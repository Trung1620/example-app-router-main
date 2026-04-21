// src/app/api/inventory/adjust/route.ts
// [POST] Tạo phiếu kiểm kê (điều chỉnh tồn kho)
import prismadb from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

type AdjustItem = {
  variantId?: string;
  productId?: string;
  currentQty: number; // số lượng hiện tại (đã kiểm kê đếm được)
  reason?: string; // lý do điều chỉnh: "hỏng", "mất", "kiểm kê"
};

export async function POST(req: Request) {
  const { orgId } = await requireApiContext(req);

  const body = (await req.json().catch(() => ({}))) as any;
  const warehouseId = String(body?.warehouseId || "").trim();
  const items: AdjustItem[] = Array.isArray(body?.items) ? body.items : [];
  const note = String(body?.note || "").trim();

  if (!warehouseId) {
    return NextResponse.json({ error: "Missing warehouseId" }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "Missing adjustment items" }, { status: 400 });
  }

  try {
    // Validate kho
    const wh = await prismadb.warehouse.findFirst({
      where: { id: warehouseId, orgId } as any,
    });

    if (!wh) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    const result = await prismadb.$transaction(async (tx) => {
      // Lấy balances hiện tại
      const keys = items.map((i) => ({
        productId: i.productId ?? null,
        variantId: i.variantId ?? null,
      }));

      const balances = await tx.stockBalance.findMany({
        where: {
          orgId,
          warehouseId,
          OR: keys,
        } as any,
      });

      const adjustItems = [];

      for (const item of items) {
        // Tìm balance hiện tại
        const balance = balances.find(
          (b) =>
            b.productId === (item.productId || null) &&
            b.variantId === (item.variantId || null)
        );

        const currentQty = balance?.qty ?? 0;
        const newQty = item.currentQty;
        const delta = newQty - currentQty; // số chênh lệch

        // Tạo item ADJUST
        adjustItems.push({
          productId: item.productId || undefined,
          variantId: item.variantId || undefined,
          qty: delta,
          note: item.reason ? `Kiểm kê: ${item.reason}` : "Kiểm kê",
        });

        // Update balance
        if (balance) {
          await tx.stockBalance.update({
            where: { id: balance.id },
            data: { qty: newQty, orgId },
          });
        } else {
          await tx.stockBalance.create({
            data: {
              orgId,
              warehouseId,
              productId: item.productId || null,
              variantId: item.variantId || null,
              qty: newQty,
            } as any,
          });
        }
      }

      // Tạo StockMove ADJUST
      const move = await tx.stockMove.create({
        data: {
          orgId,
          warehouseId,
          type: "ADJUST",
          note: note || "Phiếu kiểm kê",
          items: {
            create: adjustItems.map((item) => ({
              ...item,
              orgId,
            })),
          },
        } as any,
      });

      return { id: move.id, itemsAdjusted: adjustItems.length };
    });

    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Create adjustment failed" },
      { status: 500 }
    );
  }
}

// [GET] Lấy danh sách phiếu kiểm kê
export async function GET(req: Request) {
  const { orgId } = await requireApiContext(req);

  const url = new URL(req.url);
  const warehouseId = url.searchParams.get("warehouseId")?.trim();

  const where: any = { orgId, type: "ADJUST" };
  if (warehouseId) where.warehouseId = warehouseId;

  const moves = await prismadb.stockMove.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: true, warehouse: true },
  });

  return NextResponse.json({ moves });
}
