// src/app/api/inventory/move/route.ts
import prismadb from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

type MoveType = "IN" | "OUT" | "ADJUST";
type MoveStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

type InputItem = {
  productId?: string;
  variantId?: string;
  qty: number; // người nhập
  unitCost?: number;
  note?: string;
  reason?: string; // lý do xuất kho (VD: "bán hàng", "hỏng", "kiểm kê")
};

function keyOf(it: { productId?: string; variantId?: string }) {
  return `${it.productId || "null"}::${it.variantId || "null"}`;
}

export async function POST(req: Request) {
  const { orgId } = await requireApiContext(req);

  const body = (await req.json().catch(() => ({}))) as any;
  const warehouseId = String(body?.warehouseId || "").trim();
  const type = String(body?.type || "IN").trim() as MoveType;
  const note = String(body?.note || "").trim();

  if (!warehouseId) return NextResponse.json({ error: "Missing warehouseId" }, { status: 400 });
  if (!["IN", "OUT", "ADJUST"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const rawItems: any[] = Array.isArray(body?.items) ? body.items : [];
  if (rawItems.length === 0) return NextResponse.json({ error: "Missing items" }, { status: 400 });

  const items: InputItem[] = rawItems
    .map((x: any) => ({
      productId: x?.productId ? String(x.productId).trim() : undefined,
      variantId: x?.variantId ? String(x.variantId).trim() : undefined,
      qty: Number(x?.qty) || 0,
      unitCost: x?.unitCost != null ? Number(x.unitCost) : undefined,
      note: x?.note ? String(x.note).trim() : undefined,
    }))
    .filter((x) => (x.productId || x.variantId) && x.qty !== 0);

  if (items.length === 0) {
    return NextResponse.json({ error: "Items invalid (need qty and productId/variantId)" }, { status: 400 });
  }

  // validate kho thuộc org
  const wh = await prismadb.warehouse.findFirst({
    where: { id: warehouseId, orgId } as any,
    select: { id: true },
  });
  if (!wh) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });

  // tính delta theo type
  const deltas = items.map((it) => {
    const abs = Math.abs(it.qty);
    const delta = type === "IN" ? abs : type === "OUT" ? -abs : it.qty;
    return { ...it, delta };
  });

  const ENFORCE_NO_NEGATIVE = true;

  try {
    const result = await prismadb.$transaction(async (tx) => {
      if (ENFORCE_NO_NEGATIVE && type === "OUT") {
        // load balances theo key (productId, variantId)
        const keys = deltas.map((d) => ({ productId: d.productId ?? null, variantId: d.variantId ?? null }));

        const balances = await tx.stockBalance.findMany({
          where: {
            orgId,
            warehouseId,
            OR: keys.map((k) => ({
              productId: k.productId,
              variantId: k.variantId,
            })),
          } as any,
          select: { productId: true, variantId: true, qty: true },
        });

        const map = new Map<string, number>(
          balances.map((b) => [keyOf({ productId: b.productId ?? undefined, variantId: b.variantId ?? undefined }), b.qty])
        );

        const notEnough = deltas
          .map((d) => {
            const cur = map.get(keyOf(d)) ?? 0;
            const after = cur + d.delta; // delta âm
            return { productId: d.productId, variantId: d.variantId, cur, after };
          })
          .filter((x) => x.after < 0);

        if (notEnough.length > 0) {
          return { error: "Not enough stock", details: notEnough } as const;
        }
      }

      // tạo StockMove
      const created = await tx.stockMove.create({
        data: {
          orgId,
          warehouseId,
          type,
          note: note || undefined,
          items: {
            create: deltas.map((d) => ({
              orgId,
              productId: d.productId || undefined,
              variantId: d.variantId || undefined,
              qty: d.delta,
              unitCost: d.unitCost,
              note: d.note,
              // snapshot nếu muốn: sku/nameVi -> resolve từ variant/product ở client hoặc server
            })),
          },
        } as any,
        include: { items: true },
      });

      // update balances (upsert by unique key)
      for (const d of deltas) {
        await tx.stockBalance.upsert({
          where: {
            warehouseId_productId_variantId_materialId: {
              warehouseId,
              productId: d.productId ?? null,
              variantId: d.variantId ?? null,
              materialId: null,
            },
          } as any,
          update: { orgId, qty: { increment: d.delta } } as any,
          create: {
            orgId,
            warehouseId,
            productId: d.productId ?? null,
            variantId: d.variantId ?? null,
            materialId: null,
            qty: d.delta,
          } as any,
        });


        // Smart Cost Update: If Stock IN, update Product/Variant costPriceVnd
        if (type === "IN" && d.unitCost != null && d.unitCost > 0) {
          if (d.variantId) {
            await tx.productVariant.update({
              where: { id: d.variantId },
              data: { costPriceVnd: d.unitCost },
            });
          } else if (d.productId) {
            await tx.product.update({
              where: { id: d.productId },
              data: { costPriceVnd: d.unitCost },
            });
          }
        }
      }

      return { id: created.id } as const;
    });

    if ((result as any)?.error) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Create stock move failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { orgId } = await requireApiContext(req);
  const url = new URL(req.url);
  const warehouseId = url.searchParams.get("warehouseId")?.trim();

  const where: any = { orgId };
  if (warehouseId) where.warehouseId = warehouseId;

  const rows = await prismadb.stockMove.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      warehouse: true,
      items: { include: { product: true, variant: true } },
    },
  });

  return NextResponse.json({ rows });
}
