// src/app/api/inventory/move-confirm/route.ts
// [POST] Xác nhận phiếu nhập/xuất (chuyển từ DRAFT -> CONFIRMED)
import prismadb from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { orgId } = await requireApiContext(req);

  const body = (await req.json().catch(() => ({}))) as any;
  const moveId = String(body?.moveId || "").trim();

  if (!moveId) {
    return NextResponse.json({ error: "Missing moveId" }, { status: 400 });
  }

  try {
    // Load phiếu
    const move = await prismadb.stockMove.findFirst({
      where: { id: moveId, orgId } as any,
      include: { items: true },
    });

    if (!move) {
      return NextResponse.json({ error: "Stock move not found" }, { status: 404 });
    }

    // Nếu là OUT, check tồn kho lần nữa
    if (move.type === "OUT") {
      const keys = move.items.map((i) => ({
        productId: i.productId ?? null,
        variantId: i.variantId ?? null,
      }));

      const balances = await prismadb.stockBalance.findMany({
        where: {
          orgId,
          warehouseId: move.warehouseId,
          OR: keys,
        } as any,
        select: { productId: true, variantId: true, qty: true },
      });

      const map = new Map(
        balances.map((b) => [
          `${b.productId || "null"}::${b.variantId || "null"}`,
          b.qty,
        ])
      );

      const notEnough = move.items
        .map((i) => {
          const key = `${i.productId || "null"}::${i.variantId || "null"}`;
          const cur = map.get(key) ?? 0;
          const needed = Math.abs(i.qty);
          return { key, cur, needed };
        })
        .filter((x) => x.cur < x.needed);

      if (notEnough.length > 0) {
        return NextResponse.json(
          { error: "Not enough stock", details: notEnough },
          { status: 400 }
        );
      }
    }

    // Cập nhật status -> CONFIRMED
    const updated = await prismadb.stockMove.update({
      where: { id: moveId },
      data: { updatedAt: new Date() }, // lưu ý: nếu có field status thì update status
    });

    return NextResponse.json({ ok: true, move: updated });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Confirm failed" },
      { status: 500 }
    );
  }
}
